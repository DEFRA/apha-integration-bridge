import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import Joi from 'joi'

import { loadDocumentation } from '../../common/helpers/documentation.js'
import { hasPiiScope } from '../../common/helpers/pii-context.js'
import { findCustomerIdsByEmail } from '../../lib/db/queries/find-customer-ids-by-email.js'
import {
  findCustomers,
  FindCustomersSchema
} from '../../lib/db/queries/find-customers.js'
import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../lib/http/http-exception.js'
import { HTTPObjectResponse } from '../../lib/http/http-response.js'
import { Customer } from '../../types/find/customers.js'
import { PaginatedLinkSchema } from '../../types/find/links.js'
import { PaginationSchema } from '../../types/find/pagination.js'
import { HTTPFindRequest } from '../../lib/http/http-find-request.js'
import { config } from '../../config.js'

const PostFindCustomersSchema = Joi.object({
  data: Joi.array().items(Customer).required(),
  links: PaginatedLinkSchema
})
  .description('Customer Details')
  .label('Find Customer Response')

const UK_POSTCODE = /^(GIR\s*0AA|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/i

const PostFindPayloadSchema = Joi.object({
  ids: FindCustomersSchema.extract('ids').optional().label('Customer ids'),
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .max(254)
    .description('E-mail address to search for. Requires the pii scope'),
  surname: Joi.string()
    .trim()
    .max(100)
    .description('Only return customers with this family name'),
  postcode: Joi.string()
    .trim()
    .pattern(UK_POSTCODE, 'UK postcode')
    .description(
      'Only return customers with a current address at this postcode'
    )
})
  .xor('ids', 'email')
  .with('surname', 'email')
  .with('postcode', 'email')

const documentationNotes = loadDocumentation(import.meta.dirname, 'find.md')

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'customers'],
  description: 'Retrieve customers by ids or e-mail address',
  notes: documentationNotes,
  plugins: {
    'hapi-swagger': {
      id: 'customers-find',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    payload: PostFindPayloadSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning'),
      'Content-Type': Joi.string().allow('application/json')
    }).options({ allowUnknown: true }),
    query: PaginationSchema,
    failAction: HTTPException.failValidation
  },
  response: {
    status: {
      200: PostFindCustomersSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

const metrics = createMetricsLogger()

/**
 * @typedef {{ ids?: string[], email?: string, surname?: string, postcode?: string }} FindCustomersPayload
 */

/**
 * Adds the customers on the current page of `findRequest` to it.
 *
 * @param {import('../../types/api.js').ControllerRequest} request
 * @param {HTTPFindRequest} findRequest
 * @param {import('oracledb').Connection} connection
 */
const addCustomers = async (request, findRequest, connection) => {
  if (findRequest.ids.length === 0) {
    return
  }

  const customers = await findCustomers(connection, findRequest.ids, 'PERSON')

  const isDevelopment = config.get('isDevelopment')
  if (isDevelopment) {
    request.logger.debug(`customers: ${JSON.stringify(customers)}`)
  } else {
    const customerIds = customers.map((c) => c.id).join(', ')
    request.logger.debug(
      `Retrieved ${customers.length} customer(s): ${customerIds}`
    )
  }

  for (const customer of customers) {
    const customerResponse = new HTTPObjectResponse(
      Customer,
      customer.id,
      customer
    )

    findRequest.add(customerResponse)
  }
}

/**
 * @param {import('../../types/api.js').ControllerRequest} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').Lifecycle.ReturnValue>}
 */
const handler = async (request, h) => {
  const { email, surname, postcode } = /** @type {FindCustomersPayload} */ (
    request.payload
  )

  metrics.putMetric('customersFindRequest', 1, Unit.Count)

  if (email !== undefined && !hasPiiScope(request)) {
    request.logger.warn('Customer e-mail search refused: no pii scope')

    return new HTTPException(
      'FORBIDDEN',
      'Searching customers by e-mail address requires the pii scope'
    ).boomify()
  }

  try {
    /**
     * an id search pages over the payload ids, so an empty page needs no
     * connection; an e-mail search resolves its ids from the database first
     */
    let findRequest =
      email === undefined ? new HTTPFindRequest(request, Customer) : undefined

    if (findRequest?.ids.length === 0) {
      return h.response(findRequest.toResponse()).code(200)
    }

    /**
     * request an oracledb sam connection from the server
     */
    await using oracledb = await request.server['oracledb.sam']()

    findRequest ??= new HTTPFindRequest(
      request,
      Customer,
      await findCustomerIdsByEmail(oracledb.connection, {
        email,
        surname,
        postcode
      })
    )

    await addCustomers(request, findRequest, oracledb.connection)

    return h.response(findRequest.toResponse()).code(200)
  } catch (error) {
    request.logger.error(error)

    let httpException = error

    if (!(httpException instanceof HTTPException)) {
      httpException = new HTTPException(
        'INTERNAL_SERVER_ERROR',
        'An error occurred while processing your request',
        [new HTTPError('DATABASE_ERROR', 'Failed to execute database query')]
      )
    }

    return httpException.boomify()
  }
}

export default {
  method: 'POST',
  options,
  handler
}

import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  findCustomers,
  FindCustomersSchema
} from '../../lib/db/queries/find-customers.js'
import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../lib/http/http-exception.js'
import {
  HTTPArrayResponse,
  HTTPObjectResponse
} from '../../lib/http/http-response.js'
import { PaginatedLink } from '../../types/alpha/links.js'
import { Customer } from '../../types/alpha/customers.js'
import { PaginationSchema } from '../../types/alpha/pagination.js'
import { HTTPPaginationLinks } from '../../lib/http/http-pagination-links.js'

const PostFindCustomersSchema = Joi.object({
  data: Joi.array().items(Customer).required(),
  links: PaginatedLink
})
  .description('Customer Details')
  .label('Find Customer Response')

const PostFindPayloadSchema = Joi.object({
  ids: FindCustomersSchema.extract('ids').label('Customer ids')
})

const FindCustomersPaginationSchema = PaginationSchema.keys({
  pageSize: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .description('The number of items per page')
})

const __dirname = new URL('.', import.meta.url).pathname

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
export const options = {
  auth: false,
  tags: ['api', 'customers'],
  description: 'Retrieve customers by ids',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), 'find.md'),
    'utf8'
  ),
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
    query: FindCustomersPaginationSchema,
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

export const method = 'POST'

/**
 * @type {import('@hapi/hapi').Lifecycle.Method}
 */
export const handler = async (request, h) => {
  try {
    metrics.putMetric('customersFindRequest', 1, Unit.Count)

    /**
     * request an oracledb sam connection from the server
     */
    await using oracledb = await request.server['oracledb.sam']()

    const { page, pageSize } = request.query

    const nextOffset = pageSize * (page - 1) + pageSize

    const payload = /** @type {{ ids: string[] }} */ (request.payload)

    const distinctIds = [...new Set(payload.ids)]

    const ids = distinctIds.slice(pageSize * (page - 1), nextOffset)

    const response = new HTTPArrayResponse(Customer)

    const links = new HTTPPaginationLinks(request)

    response.links(links)

    if (ids.length > 0) {
      const customers = await findCustomers(oracledb.connection, ids, 'PERSON')

      links.setHasMore(
        nextOffset < distinctIds.length && customers.length === pageSize
      )

      request.logger?.debug(`customers: ${JSON.stringify(customers)}`)

      for (const customer of customers) {
        const customerResponse = new HTTPObjectResponse(
          Customer,
          customer.id,
          customer
        )

        response.add(customerResponse)
      }
    }

    return h.response(response.toResponse()).code(200)
  } catch (error) {
    request.logger?.error(error)

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

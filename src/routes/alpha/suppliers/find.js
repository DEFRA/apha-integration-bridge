import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import Joi from 'joi'

import { loadDocumentation } from '../../../common/helpers/documentation.js'
import {
  findSuppliers,
  FindSuppliersSchema
} from '../../../lib/db/queries/find-suppliers.js'
import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../../lib/http/http-exception.js'
import { HTTPPaginationLinks } from '../../../lib/http/http-pagination-links.js'
import { HTTPArrayResponse } from '../../../lib/http/http-response.js'
import { PaginatedLink } from '../../../types/alpha/links.js'
import { Supplier } from '../../../types/alpha/suppliers.js'
import { config } from '../../../config.js'

/**
 * @import {FindSuppliersParams} from '../../../lib/db/queries/find-suppliers.js'
 */

const GetFindSuppliersResponseSchema = Joi.object({
  data: Joi.array().items(Supplier).required(),
  links: PaginatedLink
})
  .description('Supplier Details')
  .label('Find Suppliers Response')

const __dirname = new URL('.', import.meta.url).pathname

const documentationNotes = loadDocumentation(__dirname, 'find.md')

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'alpha', 'suppliers'],
  description: 'Search suppliers by type and name prefix',
  notes: documentationNotes,
  plugins: {
    'hapi-swagger': {
      id: 'alpha-suppliers-find',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    query: FindSuppliersSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning')
    }).options({ allowUnknown: true }),
    failAction: HTTPException.failValidation
  },
  response: {
    status: {
      200: GetFindSuppliersResponseSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

const metrics = createMetricsLogger()

/**
 * @param {import('../../../types/api.js').ControllerRequest} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').Lifecycle.ReturnValue>}
 */
const handler = async (request, h) => {
  try {
    metrics.putMetric('alphaSuppliersFindRequest', 1, Unit.Count)

    // Joi has already validated and defaulted the query by this point.
    const params = /** @type {FindSuppliersParams} */ (
      /** @type {unknown} */ (request.query)
    )

    /**
     * request an oracledb sam connection from the server
     */
    await using oracledb = await request.server['oracledb.sam']()

    const { suppliers, hasMore } = await findSuppliers(
      oracledb.connection,
      params
    )

    const isDevelopment = config.get('isDevelopment')
    if (isDevelopment) {
      request.logger.debug(`suppliers: ${JSON.stringify(suppliers)}`)
    } else {
      const supplierIds = suppliers.map((s) => s.id).join(', ')
      request.logger.debug(
        `Retrieved ${suppliers.length} supplier(s): ${supplierIds}`
      )
    }

    const links = new HTTPPaginationLinks(request)
    links.setHasMore(hasMore)

    const response = new HTTPArrayResponse(Supplier).links(links)

    for (const { id, ...supplier } of suppliers) {
      response.add(id, { ...supplier, supplierType: params.type })
    }

    return h.response(response.toResponse()).code(200)
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
  method: 'GET',
  options,
  handler
}

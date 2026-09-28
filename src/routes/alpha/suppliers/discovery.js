import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import Joi from 'joi'

import { loadDocumentation } from '../../../common/helpers/documentation.js'
import {
  DISCOVERY_DATASETS,
  samDiscovery,
  SamDiscoverySchema
} from '../../../lib/db/queries/sam-discovery.js'
import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../../lib/http/http-exception.js'
import { SelfLink } from '../../../types/alpha/links.js'

/**
 * @import {SamDiscoveryParams} from '../../../lib/db/queries/sam-discovery.js'
 */

const GetDiscoveryResponseSchema = Joi.object({
  // Each dataset has its own column set, so rows are validated only as objects.
  data: Joi.array().items(Joi.object().unknown(true)).required(),
  meta: Joi.object({
    dataset: Joi.string().required(),
    description: Joi.string().required(),
    rowCount: Joi.number().integer().required(),
    durationMs: Joi.number().integer().required()
  }).required(),
  links: SelfLink
})
  .description('SAM discovery dataset')
  .label('Supplier Discovery Response')

const __dirname = new URL('.', import.meta.url).pathname

const documentationNotes = loadDocumentation(__dirname, 'discovery.md')

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'alpha', 'suppliers'],
  description:
    'Temporary probe: aggregate SAM role and involvement reference data',
  notes: documentationNotes,
  plugins: {
    'hapi-swagger': {
      id: 'alpha-suppliers-discovery',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    query: SamDiscoverySchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning')
    }).options({ allowUnknown: true }),
    failAction: HTTPException.failValidation
  },
  response: {
    status: {
      200: GetDiscoveryResponseSchema,
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
    metrics.putMetric('alphaSuppliersDiscoveryRequest', 1, Unit.Count)

    // Joi has already validated the query by this point.
    const params = /** @type {SamDiscoveryParams} */ (
      /** @type {unknown} */ (request.query)
    )

    /**
     * request an oracledb sam connection from the server
     */
    await using oracledb = await request.server['oracledb.sam']()

    const startedAt = Date.now()

    const rows = await samDiscovery(oracledb.connection, params)

    const durationMs = Date.now() - startedAt

    request.logger.debug(
      `Discovery dataset ${params.dataset}: ${rows.length} row(s) in ${durationMs}ms`
    )

    const url = new URL(request.url)

    return h
      .response({
        data: rows,
        meta: {
          dataset: params.dataset,
          description: DISCOVERY_DATASETS[params.dataset],
          rowCount: rows.length,
          durationMs
        },
        links: { self: `${url.pathname}${url.search}` }
      })
      .code(200)
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

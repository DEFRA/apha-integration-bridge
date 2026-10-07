import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import Joi from 'joi'

import { loadDocumentation } from '../../../common/helpers/documentation.js'
import { config } from '../../../config.js'
import {
  HPAI_DISCOVERY_DATASET_KEYS,
  HPAI_DISCOVERY_DATASETS,
  HpaiDiscoveryDatasetsSchema,
  PER_DATASET_TIMEOUT_MS,
  REQUEST_BUDGET_MS,
  runHpaiDiscovery
} from '../../../lib/db/queries/hpai-discovery.js'
import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../../lib/http/http-exception.js'
import { SelfLink } from '../../../types/alpha/links.js'

const DatasetDescription = {
  dataset: Joi.string().required(),
  kind: Joi.string().valid('catalogue', 'reference', 'scan').required(),
  description: Joi.string().required(),
  answers: Joi.string().required()
}

const DatasetListing = Joi.object(DatasetDescription).label(
  'HPAI Discovery Dataset'
)

const DatasetResult = Joi.object({
  ...DatasetDescription,
  rowCount: Joi.number().integer().min(0).required(),
  durationMs: Joi.number().integer().min(0).required(),
  // Each dataset has its own column set, so rows are validated only as objects.
  rows: Joi.array().items(Joi.object().unknown(true)).required(),
  error: Joi.object({
    code: Joi.string().required(),
    message: Joi.string().required()
  })
    .allow(null)
    .required()
}).label('HPAI Discovery Result')

const GetDiscoveryResponseSchema = Joi.object({
  data: Joi.array()
    .items(Joi.alternatives().try(DatasetResult, DatasetListing))
    .required(),
  meta: Joi.object({
    datasets: Joi.number().integer().min(0).required(),
    durationMs: Joi.number().integer().min(0),
    perDatasetTimeoutMs: Joi.number().integer().min(0),
    budgetMs: Joi.number().integer().min(0)
  }).required(),
  links: SelfLink
})
  .description('HPAI discovery datasets, or their results')
  .label('HPAI Discovery Response')

const __dirname = new URL('.', import.meta.url).pathname

const documentationNotes = loadDocumentation(__dirname, 'discovery.md')

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'alpha'],
  description:
    "Temporary probe: aggregate SAM data answering the HPAI contract's open questions",
  notes: documentationNotes,
  plugins: {
    'hapi-swagger': {
      id: 'alpha-hpai-discovery',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    query: Joi.object({
      dataset: HpaiDiscoveryDatasetsSchema.optional()
    }),
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
 * Mongo lock key. One probe request at a time across every instance, so the
 * probe never holds more than one SAM pool connection and leaves the rest of
 * the pool to the real routes.
 */
const LOCK_KEY = 'alpha-hpai-discovery'

/**
 * @param {import('../../../types/api.js').ControllerRequest} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').Lifecycle.ReturnValue>}
 */
const handler = async (request, h) => {
  const url = new URL(request.url)
  const links = { self: `${url.pathname}${url.search}` }

  // Joi has already validated and normalised the query by this point.
  const { dataset: datasets } = /** @type {{ dataset?: string[] }} */ (
    /** @type {unknown} */ (request.query)
  )

  if (!datasets) {
    return h
      .response({
        data: HPAI_DISCOVERY_DATASET_KEYS.map((dataset) => ({
          dataset,
          ...HPAI_DISCOVERY_DATASETS[dataset]
        })),
        meta: { datasets: HPAI_DISCOVERY_DATASET_KEYS.length },
        links
      })
      .code(200)
  }

  const startedAt = Date.now()

  try {
    metrics.putMetric('alphaHpaiDiscoveryRequest', 1, Unit.Count)

    // Freed when the block exits; expires on its own after 60 seconds if this
    // instance dies first. The request budget is 40 seconds.
    const { locker } =
      /** @type {import('../../../types/api.js').ServerWithMongo} */ (
        /** @type {unknown} */ (request.server)
      )

    await using lock = await locker.lock(LOCK_KEY)

    if (!lock) {
      return new HTTPException(
        'TOO_MANY_REQUESTS',
        'Another discovery request is running. Retry when it has finished'
      ).boomify()
    }

    /**
     * request an oracledb sam connection from the server
     */
    await using oracledb = await request.server['oracledb.sam']()

    const results = await runHpaiDiscovery(oracledb.connection, datasets, {
      startedAt
    })

    const durationMs = Date.now() - startedAt

    for (const result of results) {
      request.logger.info(
        `HPAI discovery ${result.dataset}: ${result.rowCount} row(s) in ${result.durationMs}ms${result.error ? ` (${result.error.code})` : ''}`
      )
    }

    return h
      .response({
        data: results,
        meta: {
          datasets: results.length,
          durationMs,
          perDatasetTimeoutMs: PER_DATASET_TIMEOUT_MS,
          budgetMs: REQUEST_BUDGET_MS
        },
        links
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

const isEnabled = config.get('featureFlags.isHpaiDiscoveryEnabled')

export default isEnabled
  ? {
      method: 'GET',
      options,
      handler
    }
  : null

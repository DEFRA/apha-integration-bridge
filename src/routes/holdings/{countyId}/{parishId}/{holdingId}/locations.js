import Joi from 'joi'

import { loadDocumentation } from '../../../../../common/helpers/documentation.js'
import { metricsCounter } from '../../../../../common/helpers/metrics.js'
import { toHoldingLocations } from '../../../../../lib/db/mappers/to-holding-locations.js'
import { execute } from '../../../../../lib/db/operations/execute.js'
import { findHoldingsQuery } from '../../../../../lib/db/queries/find-holdings.js'
import { findLocationsQuery } from '../../../../../lib/db/queries/find-locations.js'
import { findSubLocationsQuery } from '../../../../../lib/db/queries/find-sub-locations.js'
import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../../../../lib/http/http-exception.js'
import { SelfLinkSchema } from '../../../../../types/find/links.js'
import { HoldingLocation } from '../../../../../types/holding-locations.js'
import { FindHoldingRequestParametersSchema } from '../{holdingId}.js'

const GetHoldingLocationsResponseSchema = Joi.object({
  data: Joi.array().items(HoldingLocation).required(),
  links: SelfLinkSchema
})
  .description(
    'Every location the CPH is currently held at, one item per holdership'
  )
  .label('Holding Locations Response')

const __dirname = new URL('.', import.meta.url).pathname

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'holdings'],
  description: 'Retrieve every location a CPH is currently held at',
  notes: loadDocumentation(__dirname, 'locations.md'),
  plugins: {
    'hapi-swagger': {
      id: 'holding-locations',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    params: FindHoldingRequestParametersSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning')
    }).options({ allowUnknown: true }),
    failAction: HTTPException.failValidation
  },
  response: {
    status: {
      200: GetHoldingLocationsResponseSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

/**
 * @param {unknown[]} values
 */
const distinct = (values) => [...new Set(values)]

/**
 * @param {import('../../../../../types/api.js').ControllerRequest} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').Lifecycle.ReturnValue>}
 */
export async function handler(request, h) {
  if (request.pre.apiVersion > 1.0) {
    return new HTTPException(
      'UNSUPPORTED_VERSION',
      `Unknown version: ${request.pre.apiVersion}`
    ).boomify()
  }

  try {
    await metricsCounter('holdingLocationsRequest')

    await using oracledb = await request.server['oracledb.sam']()

    /**
     * runs one of the route's batch queries for a set of keys, counted so the
     * performance test sees every round trip
     *
     * @param {string} name
     * @param {any[]} keys
     * @param {(keys: any[]) => { sql: string; bindings: Record<string, unknown> }} toQuery
     */
    const runFor = async (name, keys, toQuery) => {
      await metricsCounter('holdingLocationsQuery', 1, { query: name })

      return execute(oracledb.connection, toQuery(keys))
    }

    const { countyId, parishId, holdingId } = request.params

    const cph = `${countyId}/${parishId}/${holdingId}`

    const holderships = await runFor('holderships', [cph], findHoldingsQuery)

    if (holderships.length < 1) {
      throw new HTTPException('NOT_FOUND', 'Holding not found or inactive')
    }

    const locationRows = await runFor(
      'locations',
      distinct(holderships.map((row) => row.location_id)),
      findLocationsQuery
    )

    const subLocationRows = await runFor(
      'subLocations',
      distinct(holderships.map((row) => row.feature_pk)),
      findSubLocationsQuery
    )

    const data = toHoldingLocations(holderships, locationRows, subLocationRows)

    request.logger.debug(`Retrieved ${data.length} location(s) for CPH ${cph}`)

    return h.response({ data, links: { self: request.path } }).code(200)
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
  handler,
  options
}

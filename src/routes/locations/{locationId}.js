import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import { execute } from '../../lib/db/operations/execute.js'
import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../lib/http/http-exception.js'
import {
  getLocation,
  GetLocationSchema
} from '../../lib/db/queries/get-location.js'
import { HTTPObjectResponse } from '../../lib/http/http-response.js'
import { LinksReference } from '../../types/links.js'
import { CommoditiesData } from '../../types/commodities.js'
import { FacilitiesData } from '../../types/facilities.js'
import { Locations } from '../../types/locations.js'

const __dirname = new URL('.', import.meta.url).pathname

/**
 * Params schema (reuse the same shape as the DB query's schema)
 * @type {Joi.ObjectSchema}
 */
export const GetLocationParamsSchema = Joi.object({
  locationId: GetLocationSchema.extract('locationId')
}).label('Get Location Parameters')

const GetLocationResponseSchema = Joi.object({
  data: Locations.required(),
  links: LinksReference
})
  .description(
    'Location details with BS7666 address and associated commodities/facilities'
  )
  .label('Get Location Response')

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
export const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'locations'],
  description:
    'Get a location and its related facilities/commodities by location ID',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), '{locationId}.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': { id: 'get', security: [{ Bearer: [] }] }
  },
  validate: {
    params: GetLocationParamsSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning')
    }).options({ allowUnknown: true }),
    failAction: (request, h, err) =>
      HTTPException.failValidation(request, h, err)
  },
  response: {
    status: {
      200: GetLocationResponseSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

const metrics = createMetricsLogger()

/**
 * Extracts the address payload from a DB row (driver returns lowercase keys).
 * @param {Record<string, any>} row
 */
function toAddress(row) {
  if (row) {
    return {
      paonStartNumber: row.paonstartnumber ?? null,
      paonStartNumberSuffix: row.paonstartnumbersuffix ?? null,
      paonEndNumber: row.paonendnumber ?? null,
      paonEndNumberSuffix: row.paonendnumbersuffix ?? null,
      paonDescription: row.paondescription ?? null,
      saonDescription: row.saondescription ?? null,
      saonStartNumber: row.saonstartnumber ?? null,
      saonStartNumberSuffix: row.saonstartnumbersuffix ?? null,
      saonEndNumber: row.saonendnumber ?? null,
      saonEndNumberSuffix: row.saonendnumbersuffix ?? null,
      street: row.street ?? null,
      locality: row.locality ?? null,
      town: row.town ?? null,
      administrativeAreaCounty: row.county ?? null,
      postcode: row.postcode ?? null,
      ukInternalCode: row.ukinternalcode ?? null,
      countryCode: row.countrycode ?? null
    }
  }
}

/**
 * @type {import('@hapi/hapi').Lifecycle.Method}
 */
export async function handler(request, h) {
  if (request.pre.apiVersion > 1.0) {
    return new HTTPException(
      'UNSUPPORTED_VERSION',
      `Unknown version: ${request.pre.apiVersion}`
    ).boomify()
  }

  const locationId = request.params.locationId

  try {
    metrics.putMetric('locationRequest', 1, Unit.Count)

    /**
     * Acquire Oracle connection
     */
    await using oracledb = await request.server['oracledb.sam']()

    /**
     * build the query
     */
    const query = getLocation(locationId)

    request.logger?.debug(`query: ${JSON.stringify(query)}`)

    /**
     * @type {Array<Record<string, any>>}
     *
     * example row keys (lowercased by the driver):
     * locationid, paonstartnumber, ..., countrycode, unitid, unittype ('LU'|'F')
     */
    const rows = await execute(oracledb.connection, query)

    request.logger?.debug(`rows: ${JSON.stringify(rows)}`)

    if (rows.length < 1) {
      /**
       * if no rows were returned, throw a 404 error
       */
      throw new HTTPException('NOT_FOUND', 'Location not found')
    }

    const address = toAddress(rows[0])

    // Build relationship datasets
    const commoditiesIds = new Set()
    const facilitiesIds = new Set()

    for (const row of rows) {
      const unitId = row.unitid
      const unitType = row.unittype

      if (!unitId) {
        continue
      }

      if (unitType === 'LU') {
        commoditiesIds.add(String(unitId))
      }

      if (unitType === 'F') {
        facilitiesIds.add(String(unitId))
      }
    }

    // Build response using HTTPObjectResponse
    const response = new HTTPObjectResponse(Locations, locationId, {
      address
    })

    // Add commodity relationships (each as a wrapped reference)
    for (const id of commoditiesIds) {
      response.relationship(
        'commodities',
        new HTTPObjectResponse(CommoditiesData, id, {})
      )
    }

    // Add facility relationships (each as a wrapped reference)
    for (const id of facilitiesIds) {
      response.relationship(
        'facilities',
        new HTTPObjectResponse(FacilitiesData, id, {})
      )
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

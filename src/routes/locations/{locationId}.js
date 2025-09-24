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
import { CommoditiesReference } from '../../types/commodities.js'
import { FacilitiesReference } from '../../types/facilities.js'

const __dirname = new URL('.', import.meta.url).pathname

/**
 * Params schema (reuse the same shape as the DB query's schema)
 * @type {Joi.ObjectSchema}
 */
export const GetLocationParamsSchema = Joi.object({
  locationId: GetLocationSchema.extract('locationId')
}).label('Get Location Parameters')

/**
 * Response schemas (for Swagger & runtime 200 validation)
 */
const LocationAddressSchema = Joi.object({
  paonStartNumber: Joi.alternatives(Joi.number(), Joi.string()).allow(null, ''),
  paonStartNumberSuffix: Joi.string().allow(null, ''),
  paonEndNumber: Joi.alternatives(Joi.number(), Joi.string()).allow(null, ''),
  paonEndNumberSuffix: Joi.string().allow(null, ''),
  paonDescription: Joi.string().allow(null, ''),
  saonDescription: Joi.string().allow(null, ''),
  saonStartNumber: Joi.alternatives(Joi.number(), Joi.string()).allow(null, ''),
  saonStartNumberSuffix: Joi.string().allow(null, ''),
  saonEndNumber: Joi.alternatives(Joi.number(), Joi.string()).allow(null, ''),
  saonEndNumberSuffix: Joi.string().allow(null, ''),
  street: Joi.string().allow(null, ''),
  locality: Joi.string().allow(null, ''),
  town: Joi.string().allow(null, ''),
  administrativeAreaCounty: Joi.string().allow(null, ''), // maps ADMINISTRATIVE_AREA
  postcode: Joi.string().allow(null, ''),
  ukInternalCode: Joi.string().allow(null, ''),
  countryCode: Joi.string().allow(null, '')
}).required()

const GetLocationResponseSchema = Joi.object({
  data: Joi.object({
    type: Joi.string().valid('locations').required(),
    id: Joi.string().required(),
    address: LocationAddressSchema,
    relationships: Joi.object({
      // HTTPObjectResponse serializes a single related item as an object,
      // and multiple items as an array of wrapped references.
      commodities: Joi.alternatives()
        .try(CommoditiesReference, Joi.array().items(CommoditiesReference))
        .optional(),
      facilities: Joi.alternatives()
        .try(FacilitiesReference, Joi.array().items(FacilitiesReference))
        .optional()
    })
      .min(1)
      .optional()
  }).required(),
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
    'hapi-swagger': { id: 'get' }
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
    const response = new HTTPObjectResponse(
      'locations',
      locationId,
      { address },
      { self: `/locations/${locationId}` }
    )

    // Add commodity relationships (each as a wrapped reference)
    for (const id of commoditiesIds) {
      response.relationship(
        'commodities',
        new HTTPObjectResponse(
          'commodities',
          id,
          {},
          { self: `/locations/${locationId}/relationships/commodities` }
        )
      )
    }

    // Add facility relationships (each as a wrapped reference)
    for (const id of facilitiesIds) {
      response.relationship(
        'facilities',
        new HTTPObjectResponse(
          'facilities',
          id,
          {},
          { self: `/locations/${locationId}/relationships/facilities` }
        )
      )
    }

    return h.response(response.toResponse()).code(200)
  } catch (error) {
    console.error(error)
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

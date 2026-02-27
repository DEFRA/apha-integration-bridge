import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import { findLocationsQuery } from '../../lib/db/queries/find-locations.js'
import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../lib/http/http-exception.js'
import { Locations } from '../../types/find/locations.js'
import { PaginationSchema } from '../../types/find/pagination.js'
import { HTTPFindRequest } from '../../lib/http/http-find-request.js'
import { PaginatedLinkSchema } from '../../types/find/links.js'
import { execute } from '../../lib/db/operations/execute.js'

const PostFindLocationsResponseSchema = Joi.object({
  data: Joi.array().items(Locations).required(),
  links: PaginatedLinkSchema
})
  .description('Location Details')
  .label('Find Location Response')

const PostFindPayloadSchema = Joi.object({
  ids: Joi.array()
    .items(
      Joi.string()
        .pattern(/^L\d+$/)
        .required()
        .description('Location ID (e.g., L97339)')
    )
    .min(1)
    .required()
    .label('Location ids')
})

/**
 * @typedef {{
 *   ids: string[]
 * }} PostFindPayload
 */

const __dirname = new URL('.', import.meta.url).pathname

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'locations'],
  description: 'Retrieve locations by ids',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), 'find.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'locations-find',
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
      200: PostFindLocationsResponseSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

const metrics = createMetricsLogger()

/**
 * @param {Record<string, any>} row
 */
function toAddress(row) {
  if (row) {
    return {
      primaryAddressableObject: {
        startNumber: row.paonstartnumber ?? null,
        startNumberSuffix: row.paonstartnumbersuffix ?? null,
        endNumber: row.paonendnumber ?? null,
        endNumberSuffix: row.paonendnumbersuffix ?? null,
        description: row.paondescription ?? null
      },
      secondaryAddressableObject: {
        startNumber: row.saonstartnumber ?? null,
        startNumberSuffix: row.saonstartnumbersuffix ?? null,
        endNumber: row.saonendnumber ?? null,
        endNumberSuffix: row.saonendnumbersuffix ?? null,
        description: row.saondescription ?? null
      },
      street: row.street ?? null,
      locality: row.locality ?? null,
      town: row.town ?? null,
      postcode: row.postcode ?? null,
      countryCode: row.countrycode ?? null
    }
  }
}

/**
 * @param {Array<Record<string, any>>} rows
 * @param {string[]} requestedIds - The IDs in the order they were requested
 * @returns {Array<Object>}
 */
function buildLocationsFromRows(rows, requestedIds) {
  const locationMap = new Map()

  for (const row of rows) {
    const locationId = row.location_id

    if (!locationMap.has(locationId)) {
      locationMap.set(locationId, {
        type: 'locations',
        id: locationId,
        name: null,
        address: toAddress(row),
        osMapReference: row.osmapref ?? null,
        livestockUnits: [],
        facilities: [],
        relationships: {}
      })
    }

    const location = locationMap.get(locationId)
    const unitId = row.unitid
    const unitType = row.unittype

    if (unitId && unitType === 'LU') {
      const existingLU = location.livestockUnits.find(
        (lu) => lu.id === String(unitId)
      )
      if (!existingLU) {
        location.livestockUnits.push({
          type: 'animal-commodities',
          id: String(unitId),
          animalQuantities: row.usualquantity ?? 0,
          species: null
        })
      }
    }

    if (unitId && unitType === 'F') {
      const existingFacility = location.facilities.find(
        (f) => f.id === String(unitId)
      )
      if (!existingFacility) {
        location.facilities.push({
          type: 'facilities',
          id: String(unitId),
          name: null,
          facilityType: null,
          businessActivity: null
        })
      }
    }
  }

  // Return locations in the order they were requested
  const orderedLocations = []
  for (const id of requestedIds) {
    if (locationMap.has(id)) {
      orderedLocations.push(locationMap.get(id))
    }
  }

  return orderedLocations
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

  try {
    metrics.putMetric('locationsFindRequest', 1, Unit.Count)

    const findRequest = new HTTPFindRequest(request, Locations)

    if (findRequest.ids.length > 0) {
      await using oracledb = await request.server['oracledb.sam']()

      const query = findLocationsQuery(findRequest.ids)
      const rows = await execute(oracledb.connection, query)

      request.logger?.debug({ query }, 'Executing locations query')
      request.logger?.debug({ rowCount: rows.length }, 'Locations query result')

      const locations = buildLocationsFromRows(rows, findRequest.ids)

      for (const location of locations) {
        findRequest.add(location.id, location)
      }
    }

    return h.response(findRequest.toResponse()).code(200)
  } catch (error) {
    if (request.logger) {
      request.logger.error(error)
    }

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
  handler,
  options
}

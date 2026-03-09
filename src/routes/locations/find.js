import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../lib/http/http-exception.js'

import { LocationsSchema } from '../../types/find/locations.js'
import { PaginationSchema } from '../../types/find/pagination.js'
import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import { findLocations } from '../../lib/db/queries/find-locations.js'
import { HTTPObjectResponse } from '../../lib/http/http-response.js'
import { PaginatedLinkSchema } from '../../types/find/links.js'
import { HTTPFindRequest } from '../../lib/http/http-find-request.js'
import { LocationIdSchema } from '../../types/locations.js'

/**
 * @import {PaginatedLink} from '../../types/find/links.js'
 * @import {Locations} from '../../types/find/locations.js'
 */

/**
 * @typedef {{
 *   data: Locations[],
 *   links: PaginatedLink
 * }} PostFindLocationsResponse
 */

const PostFindLocationsResponseSchema = Joi.object({
  data: Joi.array().items(LocationsSchema).required(),
  links: PaginatedLinkSchema
})
  .description('Location Details')
  .label('Find Location Response')

const PostFindPayloadSchema = Joi.object({
  ids: Joi.array()
    .items(LocationIdSchema.description('Location ID (e.g., L97339)'))
    .min(1)
    .required()
    .label('Location ids')
})

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
 * @type {import('@hapi/hapi').Lifecycle.Method}
 */
export async function handler(request, h) {
  try {
    metrics.putMetric('locationsFindRequest', 1, Unit.Count)

    const findRequest = new HTTPFindRequest(request, LocationsSchema)

    if (findRequest.ids.length === 0) {
      return h.response(findRequest.toResponse()).code(200)
    }

    await using oracledb = await request.server['oracledb.sam']()

    const locations = await findLocations(oracledb.connection, findRequest.ids)

    request.logger?.debug(`locations: ${JSON.stringify(locations)}`)

    for (const location of locations) {
      const locationResponse = new HTTPObjectResponse(
        LocationsSchema,
        location.id,
        location
      )

      findRequest.add(locationResponse)
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

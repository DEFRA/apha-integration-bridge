import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../lib/http/http-exception.js'

import { HoldingsSchema } from '../../types/find/holdings.js'
import { PaginationSchema } from '../../types/find/pagination.js'
import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import { findHoldingsQuery } from '../../lib/db/queries/find-holdings.js'
import { execute } from '../../lib/db/operations/execute.js'
import { HTTPObjectResponse } from '../../lib/http/http-response.js'
import {
  buildPaginatedLinks,
  getDataSubset
} from '../../common/helpers/pagination/pagination.js'
import { PaginatedLinkSchema } from '../../types/find/links.js'

/**
 * @import {PaginatedLink} from '../../types/find/links.js'
 * @import {Holdings} from '../../types/find/holdings.js'
 */

/**
 * @typedef {{
 *   data: Holdings[],
 *   links: PaginatedLink
 * }} PostFindHoldingsResponse
 */

const PostFindHoldingsResponseSchema = Joi.object({
  data: Joi.array().items(HoldingsSchema).required(),
  links: PaginatedLinkSchema
})
  .description('Holdings Find Result')
  .label('Find Holdings Response')

const PostFindPayloadSchema = Joi.object({
  ids: Joi.array()
    .items(
      Joi.string()
        .pattern(/^\d{2}\/\d{3}\/\d{4}$/)
        .required()
        .description('CPH')
    )
    .min(1)
    .required()
    .description('List of CPHs')
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
  auth: false,
  tags: ['api', 'holdings'],
  description: 'Retrieve holdings by ids',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), 'find.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'holdings-find',
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
      200: PostFindHoldingsResponseSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

const metrics = createMetricsLogger()

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
    const requestPayload = /** @type {PostFindPayload} */ (request.payload)

    metrics.putMetric('holdingFindRequest', 1, Unit.Count)

    await using oracledb = await request.server['oracledb.sam']()

    const query = findHoldingsQuery(
      getDataSubset(
        requestPayload.ids,
        request.query.page,
        request.query.pageSize
      )
    )
    const rows = await execute(oracledb.connection, query)

    request.logger?.debug({ query }, 'Executing holdings query')
    request.logger?.debug({ rowCount: rows.length }, 'Holdings query result')

    const data = rows.map((row) => {
      const { cph_id: cphId, la_name: localAuthorityName } = row
      return new HTTPObjectResponse(HoldingsSchema, cphId, {
        type: 'holdings',
        id: cphId,
        localAuthority: localAuthorityName ?? null
      }).toResponse(false).data
    })

    const links = buildPaginatedLinks(
      request,
      request.query.page,
      request.query.pageSize,
      requestPayload.ids.length
    )

    return h.response({ data, links }).code(200)
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

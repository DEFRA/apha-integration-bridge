import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../lib/http/http-exception.js'

import { WorkordersSchema } from '../../types/find/workorders.js'
import { PaginationSchema } from '../../types/find/pagination.js'
import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import { findWorkorders } from '../../lib/db/queries/find-workorders.js'
import { HTTPObjectResponse } from '../../lib/http/http-response.js'
import { PaginatedLinkSchema } from '../../types/find/links.js'
import { HTTPFindRequest } from '../../lib/http/http-find-request.js'

/**
 * @import {PaginatedLink} from '../../types/find/links.js'
 * @import {Workorders} from '../../types/find/workorders.js'
 */

/**
 * @typedef {{
 *   data: Workorders[],
 *   links: PaginatedLink
 * }} PostFindWorkordersResponse
 */

const PostFindWorkordersResponseSchema = Joi.object({
  data: Joi.array().items(WorkordersSchema).required(),
  links: PaginatedLinkSchema
})
  .description('Workorder Details')
  .label('Find Workorder Response')

const PostFindPayloadSchema = Joi.object({
  ids: Joi.array()
    .items(
      Joi.string()
        .trim()
        .pattern(/^WS-[0-9]{5}$/i)
        .required()
    )
    .min(1)
    .required()
    .description('Workorder ids')
})

const __dirname = new URL('.', import.meta.url).pathname

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'workorders'],
  description: 'Retrieve workorders by ids',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), 'find.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'workorders-find',
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
      200: PostFindWorkordersResponseSchema,
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
    metrics.putMetric('workordersFindRequest', 1, Unit.Count)

    const findRequest = new HTTPFindRequest(request, WorkordersSchema)

    if (findRequest.ids.length > 0) {
      await using pegadb = await request.server['oracledb.pega']()
      await using samdb = await request.server['oracledb.sam']()

      const workorders = await findWorkorders(
        { pegadb: pegadb.connection, samdb: samdb.connection },
        findRequest.ids
      )

      request.logger?.debug(`workorders: ${JSON.stringify(workorders)}`)

      for (const workorder of workorders) {
        const workorderResponse = new HTTPObjectResponse(
          WorkordersSchema,
          workorder.id,
          workorder
        )

        findRequest.add(workorderResponse)
      }
    }

    return h.response(findRequest.toResponse()).code(200)
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

export default {
  method: 'POST',
  options,
  handler
}

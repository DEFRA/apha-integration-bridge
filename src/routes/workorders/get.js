import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import Joi from 'joi'

import { loadDocumentation } from '../../common/helpers/documentation.js'
import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../lib/http/http-exception.js'
import { getWorkorders } from '../../lib/db/queries/get-workorders.js'
import { HTTPArrayResponse } from '../../lib/http/http-response.js'
import { HTTPPaginationLinks } from '../../lib/http/http-pagination-links.js'
import { WorkordersSchema } from '../../types/find/workorders.js'
import { PaginatedLinkSchema } from '../../types/find/links.js'
import { GetWorkordersSchema } from '../../types/find/workorders-get.js'

const __dirname = new URL('.', import.meta.url).pathname

const documentationNotes = loadDocumentation(__dirname, 'get.md')

const GetWorkordersResponseSchema = Joi.object({
  data: Joi.array().items(WorkordersSchema).required(),
  links: PaginatedLinkSchema
})
  .description('Workorder Details')
  .label('Get Workorders Response')

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'workorders'],
  description: 'Retrieve workorders by activation date range',
  notes: documentationNotes,
  plugins: {
    'hapi-swagger': {
      id: 'workorders-get',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    query: GetWorkordersSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning')
    }).options({ allowUnknown: true }),
    failAction: HTTPException.failValidation
  },
  response: {
    status: {
      200: GetWorkordersResponseSchema,
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
    metrics.putMetric('workordersGetRequest', 1, Unit.Count)

    await using pegadb = await request.server['oracledb.pega']()
    await using samdb = await request.server['oracledb.sam']()

    const { workorders, hasMore } = await getWorkorders(
      { pegadb: pegadb.connection, samdb: samdb.connection },
      request.query
    )

    request.logger?.debug(`workorders: ${JSON.stringify(workorders)}`)

    const response = new HTTPArrayResponse(WorkordersSchema)
    const links = new HTTPPaginationLinks(request)

    links.setHasMore(hasMore)
    response.links(links)

    for (const workorder of workorders) {
      response.add(workorder.id, workorder)
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

export default {
  method: 'GET',
  path: '/workorders',
  options,
  handler
}

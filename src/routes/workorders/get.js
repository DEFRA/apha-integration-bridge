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
  const startActivationDate = new Date(request.query.startActivationDate)
  const endActivationDate = new Date(request.query.endActivationDate)

  if (endActivationDate <= startActivationDate) {
    return new HTTPException('BAD_REQUEST', 'Invalid request parameters', [
      new HTTPError(
        'VALIDATION_ERROR',
        'End activation date must be after start activation date',
        {
          startActivationDate: request.query.startActivationDate,
          endActivationDate: request.query.endActivationDate
        }
      )
    ]).boomify()
  }

  try {
    metrics.putMetric('workordersGetRequest', 1, Unit.Count)

    /** @type {{
     *   startActivationDate: string
     *   endActivationDate: string
     *   country: string
     *   page: number
     *   pageSize: number
     * }} */
    const parameters = {
      startActivationDate: request.query.startActivationDate,
      endActivationDate: request.query.endActivationDate,
      country: request.query.country,
      page: request.query.page,
      pageSize: request.query.pageSize
    }

    await using pegadb = await request.server['oracledb.pega']()
    await using samdb = await request.server['oracledb.sam']()

    const { workorders, hasMore } = await getWorkorders(
      { pegadb: pegadb.connection, samdb: samdb.connection },
      parameters
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

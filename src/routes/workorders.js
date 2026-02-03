import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import { LinksReference } from '../types/links.js'
import { Workorders } from '../types/workorders.js'
import { HTTPArrayResponse } from '../lib/http/http-response.js'
import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../lib/http/http-exception.js'

import { all } from './workorders.mocks.js'

const __dirname = new URL('.', import.meta.url).pathname

const PaginationWorkordersResponseSchema = Joi.object({
  data: Joi.array().items(Workorders).required(),
  links: LinksReference
})
  .description('A response from the workorders endpoint')
  .label('Workorders Response')

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
export const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'workorders'],
  description:
    'Retrieve workorders filtered by activation date range and paginated',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), 'workorders.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'workorders',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    query: Joi.object({
      startActivationDate: Joi.string()
        .isoDate()
        .default(() => new Date().toISOString())
        .description(
          'Paginate workorders after or on this start activation date'
        ),
      endActivationDate: Joi.string()
        .isoDate()
        .description(
          'Paginate workorders before or on this end activation date'
        ),
      page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .description('The page number to retrieve'),
      pageSize: Joi.number()
        .integer()
        .min(1)
        .max(10)
        .default(10)
        .description('The number of items per page')
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
      200: PaginationWorkordersResponseSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

const metrics = createMetricsLogger()

/**
 * @type {import('@hapi/hapi').Lifecycle.Method}
 */
export async function handler(request, h) {
  /**
   * parse the start activation date from the query parameters
   */
  const startActivationDate = new Date(request.query.startActivationDate)

  /**
   * @type {Date | undefined}
   */
  let endActivationDate

  if (request.query.endActivationDate) {
    /**
     * an end activation date was provided, parse it
     */
    endActivationDate = new Date(request.query.endActivationDate)
  }

  /**
   * validate the dates that have been supplied
   */
  if (endActivationDate && endActivationDate <= startActivationDate) {
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

  /**
   * if the start activation date is in the future, throw an error
   * as this is not a valid request
   */
  if (startActivationDate > new Date()) {
    return new HTTPException('BAD_REQUEST', 'Invalid request parameters', [
      new HTTPError(
        'VALIDATION_ERROR',
        'Start activation date cannot be in the future',
        {
          startActivationDate: request.query.startActivationDate
        }
      )
    ]).boomify()
  }

  /**
   * only supported API version is 1.0
   */
  if (request.pre.apiVersion > 1.0) {
    return new HTTPException(
      'UNSUPPORTED_VERSION',
      `Unknown version: ${request.pre.apiVersion}`
    ).boomify()
  }

  try {
    metrics.putMetric('workordersRequest', 1, Unit.Count)

    const { page, pageSize } = request.query

    const selfQueryParams = new URLSearchParams([
      ['startActivationDate', request.query.startActivationDate],
      ['page', String(page)],
      ['pageSize', String(pageSize)]
    ])

    if (endActivationDate) {
      selfQueryParams.set('endActivationDate', request.query.endActivationDate)
    }

    /**
     * mock paginate over the "all" array
     */
    const paginatedWorkorders = all.slice(
      (page - 1) * pageSize,
      page * pageSize
    )

    /**
     * @type {string | undefined}
     */
    let prevLink

    /**
     * @type {string | undefined}
     */
    let nextLink

    if (paginatedWorkorders.length === pageSize) {
      const nextQueryParams = new URLSearchParams(selfQueryParams.toString())

      nextQueryParams.set('page', String(page + 1))

      nextLink = `/workorders?${nextQueryParams.toString()}`
    }

    if (page > 1) {
      const prevQueryParams = new URLSearchParams(selfQueryParams.toString())

      prevQueryParams.set('page', String(page - 1))

      prevLink = `/workorders?${prevQueryParams.toString()}`
    }

    const response = new HTTPArrayResponse()

    const links = {}

    if (nextLink) {
      links.next = nextLink
    }

    if (prevLink) {
      links.prev = prevLink
    }

    if (Object.keys(links).length > 0) {
      response.links(links)
    }

    for (const workorder of paginatedWorkorders) {
      response.add(workorder)
    }

    return h.response(response.toResponse()).code(200)
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

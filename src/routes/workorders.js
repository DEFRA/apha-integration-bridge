import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import { LinksReference } from '../types/links.js'
import { Workorders } from '../types/workorders.js'
import {
  HTTPArrayResponse,
  HTTPObjectResponse
} from '../lib/http/http-response.js'
import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../lib/http/http-exception.js'

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
  description: 'Retrieve workorders filtered by activation date range',
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
        )
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

    const selfQueryParams = new URLSearchParams({
      startActivationDate: request.query.startActivationDate
    })

    if (endActivationDate) {
      selfQueryParams.set('endActivationDate', request.query.endActivationDate)
    }

    const response = new HTTPArrayResponse({
      self: `/workorders?${selfQueryParams.toString()}`,
      next: `/workorders?${selfQueryParams.toString()}`
    })

    const first = new HTTPObjectResponse('workorders', 'WS-76512', {
      status: 'Open',
      startDate: '2024-01-01T09:00:00+00:00',
      activationDate: '2024-01-05T08:30:00+00:00',
      purpose: 'Initiate Incident Premises Spread Tracing Action',
      workArea: 'Tuberculosis',
      country: 'SCOTLAND',
      businessArea: 'Endemic Notifiable Disease',
      aim: 'Contain / Control / Eradicate Endemic Disease',
      latestActivityCompletionDate: '2024-01-01T12:00:00+00:00',
      phase: 'EXPOSURETRACKING'
    })

    first.relationship(
      'customer',
      new HTTPObjectResponse(
        'customers',
        'C123456',
        {},
        {
          self: '/workorders/WS-76512/relationships/customer'
        }
      )
    )

    first.relationship(
      'holding',
      new HTTPObjectResponse(
        'holdings',
        '08/139/0167',
        {},
        {
          self: '/workorders/WS-76512/relationships/holding'
        }
      )
    )

    first.relationship(
      'location',
      new HTTPObjectResponse(
        'locations',
        'L123456',
        {},
        {
          self: '/workorders/WS-76512/relationships/location'
        }
      )
    )

    first.relationship(
      'commodity',
      new HTTPObjectResponse(
        'commodities',
        'U000010',
        {},
        {
          self: '/workorders/WS-76512/relationships/commodity'
        }
      )
    )

    first.relationship(
      'activities',
      new HTTPObjectResponse(
        'activities',
        undefined,
        {},
        {
          self: '/workorders/WS-76512/relationships/activities'
        }
      )
    )

    response.add(first)

    const second = new HTTPObjectResponse('workorders', 'WS-76513', {
      status: 'Open',
      startDate: '2024-01-03T09:00:00+00:00',
      activationDate: '2024-01-06T08:30:00+00:00',
      purpose: 'Initiate Incident Premises Spread Tracing Action',
      workArea: 'Tuberculosis',
      country: 'SCOTLAND',
      businessArea: 'Endemic Notifiable Disease',
      aim: 'Contain / Control / Eradicate Endemic Disease',
      latestActivityCompletionDate: '2024-01-01T12:00:00+00:00',
      phase: 'EXPOSURETRACKING'
    })

    second.relationship(
      'customer',
      new HTTPObjectResponse(
        'customers',
        'C123457',
        {},
        {
          self: '/workorders/WS-76513/relationships/customer'
        }
      )
    )

    second.relationship(
      'holding',
      new HTTPObjectResponse(
        'holdings',
        '08/139/0168',
        {},
        {
          self: '/workorders/WS-76513/relationships/holding'
        }
      )
    )

    second.relationship(
      'location',
      new HTTPObjectResponse(
        'locations',
        'L123457',
        {},
        {
          self: '/workorders/WS-76513/relationships/location'
        }
      )
    )

    second.relationship(
      'facility',
      new HTTPObjectResponse(
        'facilities',
        'U000030',
        {},
        {
          self: '/workorders/WS-76513/relationships/facility'
        }
      )
    )

    second.relationship(
      'activities',
      new HTTPObjectResponse(
        'activities',
        'test',
        {},
        {
          self: '/workorders/WS-76513/relationships/activities'
        }
      )
    )

    response.add(second)

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

import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import { Holdings } from '../../../../types/holdings.js'
import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../../../lib/http/http-exception.js'
import { execute } from '../../../../lib/db/operations/execute.js'
import {
  findHoldingQuery,
  FindHoldingSchema
} from '../../../../lib/db/queries/find-holding.js'
import { HTTPObjectResponse } from '../../../../lib/http/http-response.js'
import { LinksReference } from '../../../../types/links.js'

const __dirname = new URL('.', import.meta.url).pathname

const FindHoldingResponseSchema = Joi.object({
  data: Holdings.label('Basic Holding Data'),
  links: LinksReference
})
  .description(
    'A matching CPH number exists in Sam and basic information about the holding has been retrieved.'
  )
  .label('Find Holding Response')

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
export const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'holdings'],
  description: 'Find a holding using its county, parish, and holdings ID',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), '{holdingId}.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'find',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    params: FindHoldingSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning')
    }).options({ allowUnknown: true }),
    failAction: HTTPException.failValidation
  },
  response: {
    status: {
      200: FindHoldingResponseSchema,
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
    metrics.putMetric('holdingRequest', 1, Unit.Count)

    /**
     * request an oracledb sam connection from the server
     */
    await using oracledb = await request.server['oracledb.sam']()

    /**
     * construct the query to find the holding
     */
    const query = findHoldingQuery(request.params)

    request.logger?.debug(`query: ${JSON.stringify(query)}`)

    /**
     * execute the query and determine if any rows were returned
     *
     * @type {{
     *   cph: string;
     *   cphtype: string;
     *   cphholdercustomerid: string;
     *   locationid: string;
     *   laname: string;
     *   lanumber: string;
     *   cphactive: string;
     * }[]}
     */
    const rows = await execute(oracledb.connection, query)

    request.logger?.debug(`rows: ${JSON.stringify(rows)}`)

    if (rows.length < 1) {
      /**
       * if no rows were returned, throw a 404 error
       */
      throw new HTTPException('NOT_FOUND', 'Holding not found or inactive')
    }

    if (rows.length > 1) {
      /**
       * if multiple rows were returned, throw a duplicate resources error
       */
      throw new HTTPException(
        'DUPLICATE_RESOURCES_FOUND',
        'Duplicate Location resources found associated with given CPH number.'
      )
    }

    const [row] = rows

    const { cph, cphtype, locationid } = row

    const response = new HTTPObjectResponse('holdings', cph, {
      cphType: cphtype
    })

    response.relationship(
      'location',
      new HTTPObjectResponse('locations', locationid, {})
    )

    if (row.cphholdercustomerid) {
      response.relationship(
        'cphHolder',
        new HTTPObjectResponse('customers', row.cphholdercustomerid, {})
      )
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

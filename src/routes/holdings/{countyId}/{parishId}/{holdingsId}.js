import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  HTTPException,
  HTTPError
} from '../../../../lib/http/http-exception.js'
import { execute } from '../../../../lib/db/operations/execute.js'
import {
  findHoldingQuery,
  FindHoldingSchema
} from '../../../../lib/db/queries/find-holding.js'

const __dirname = new URL('.', import.meta.url).pathname

export const options = {
  tags: ['api', 'holdings'],
  description: 'Find a holding using its county, parish, and holdings ID',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), '{holdingsId}.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'list'
    }
  },
  validate: {
    params: FindHoldingSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.integration-bridge.v1+json')
        .description('Accept header for API versioning')
    }).options({ allowUnknown: true })
  }
}

export async function handler(request, h) {
  if (request.pre.apiVersion > 1.0) {
    return new HTTPException(
      'UNSUPPORTED_VERSION',
      `Unknown version: ${request.pre.apiVersion}`
    )
  }

  try {
    /**
     * request an oracledb sam connection from the server
     */
    await using oracledb = await request.server['oracledb.sam']()

    /**
     * construct the query to find the holding
     */
    const query = findHoldingQuery(request.params)

    /**
     * execute the query and determine if any rows were returned
     */
    const rows = await execute(oracledb.connection, query)

    if (rows.length < 1) {
      /**
       * if no rows were returned, throw a 404 error
       */
      throw new HTTPException('NOT_FOUND', 'Holding not found')
    }

    const [row] = rows

    const { cph, ...attributes } = row

    return h
      .response({
        data: {
          type: 'holdings',
          id: cph,
          attributes
        }
      })
      .code(200)
  } catch (error) {
    request.logger.error(error)

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

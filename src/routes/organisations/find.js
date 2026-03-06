import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  findCustomers,
  FindCustomersSchema
} from '../../lib/db/queries/find-customers.js'
import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../lib/http/http-exception.js'
import { HTTPFindRequest } from '../../lib/http/http-find-request.js'
import { HTTPObjectResponse } from '../../lib/http/http-response.js'
import { PaginatedLinkSchema } from '../../types/find/links.js'
import { Organisation } from '../../types/find/organisations.js'
import { PaginationSchema } from '../../types/find/pagination.js'

const PostFindOrganisationsSchema = Joi.object({
  data: Joi.array().items(Organisation).required(),
  links: PaginatedLinkSchema
})
  .description('Organisation Details')
  .label('Find Organisation Response')

const PostFindPayloadSchema = Joi.object({
  ids: FindCustomersSchema.extract('ids').label('Organisation ids')
})

const __dirname = new URL('.', import.meta.url).pathname

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'organisations'],
  description: 'Retrieve organisations by ids',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), 'find.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'organisations-find',
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
      200: PostFindOrganisationsSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

const metrics = createMetricsLogger()

/**
 * @type {import('@hapi/hapi').Lifecycle.Method}
 */
const handler = async (request, h) => {
  try {
    metrics.putMetric('organisationsFindRequest', 1, Unit.Count)

    /**
     * request an oracledb sam connection from the server
     */
    await using oracledb = await request.server['oracledb.sam']()

    const findRequest = new HTTPFindRequest(request, Organisation)

    if (findRequest.ids.length > 0) {
      const organisations = await findCustomers(
        oracledb.connection,
        findRequest.ids,
        'ORGANISATION'
      )

      request.logger?.debug(`organisations: ${JSON.stringify(organisations)}`)

      for (const organisation of organisations) {
        const organisationResponse = new HTTPObjectResponse(
          Organisation,
          organisation.id,
          organisation
        )

        findRequest.add(organisationResponse)
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

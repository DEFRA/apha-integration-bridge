import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'
import retry from 'async-retry'

import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../../lib/http/http-exception.js'

import { HTTPArrayResponse } from '../../../lib/http/http-response.js'
import { TopLevelLinksReference } from '../../../types/links.js'
import { CaseManagementUser } from '../../../types/case-management-users.js'
import { salesforceClient } from '../../../lib/salesforce/client.js'

const PostFindUsersResponseSchema = Joi.object({
  data: Joi.array().items(CaseManagementUser).required(),
  links: TopLevelLinksReference
})
  .description('Case Management User Details')
  .label('Find User Response')

const PostFindUsersPayloadSchema = Joi.object({
  emailAddress: Joi.string()
    .email({ tlds: false })
    .required()
    .label('Email Address')
    .messages({
      'string.email': 'emailAddress provided is not in a valid format'
    })
})

const __dirname = new URL('.', import.meta.url).pathname

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: false,
  tags: ['api', 'case-management'],
  description: 'Find if a user exists in Salesforce',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), 'find.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'case-management-users-find',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    payload: PostFindUsersPayloadSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning'),
      'Content-Type': Joi.string().allow('application/json')
    }).options({ allowUnknown: true }),
    failAction: (request, h, error) => {
      if (error instanceof Joi.ValidationError) {
        const validationError = error.details.find(
          (detail) => detail.path[0] === 'emailAddress'
        )

        if (validationError) {
          return new HTTPException(
            'BAD_REQUEST',
            'Your request could not be processed',
            [new HTTPError('VALIDATION_ERROR', validationError.message)]
          ).boomify()
        }
      }

      return HTTPException.failValidation(request, h, error)
    }
  },
  response: {
    status: {
      200: PostFindUsersResponseSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

/**
 * @type {import('@hapi/hapi').Lifecycle.Method}
 */
async function handler(request, h) {
  const { emailAddress } = /** @type {{ emailAddress: string }} */ (
    request.payload
  )

  try {
    const salesforceToken = await salesforceClient.getAccessToken(
      request.logger
    )

    const result = await retry(
      async (bail) => {
        const query = `SELECT Id FROM User WHERE Username = '${emailAddress.replace(/'/g, "\\'")}' AND IsActive = true LIMIT 1`

        return await salesforceClient.sendQuery(
          query,
          salesforceToken,
          request.logger
        )
      },
      {
        retries: 3,
        maxRetryTime: 10000,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 4000
      }
    )

    const response = new HTTPArrayResponse(CaseManagementUser)

    if (result.records && result.records.length > 0) {
      const user = result.records?.[0]
      if (!user) return

      response.add(user.Id, {})
    }

    response.links({ self: request.path })

    return h.response(response.toResponse()).code(200)
  } catch (error) {
    request.logger?.error(
      {
        err: error,
        emailAddress,
        endpoint: 'case-management/users/find'
      },
      'Failed to query Salesforce for user'
    )

    return new HTTPException(
      'INTERNAL_SERVER_ERROR',
      'Your request could not be processed',
      [
        new HTTPError(
          'DATABASE_ERROR',
          'Cannot perform query successfully on the case management service'
        )
      ]
    ).boomify()
  }
}

export default {
  method: 'POST',
  path: '/case-management/users/find',
  handler,
  options
}

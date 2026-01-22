import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'
import retry from 'async-retry'

import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../../lib/http/http-exception.js'

import { testUsers } from './find.mocks.js'
import {
  HTTPArrayResponse,
  HTTPObjectResponse
} from '../../../lib/http/http-response.js'
import { LinksReference } from '../../../types/links.js'
import { CaseManagementUser } from '../../../types/case-management-users.js'

const PostFindUsersResponseSchema = Joi.object({
  data: Joi.array().items(CaseManagementUser).required(),
  links: LinksReference
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
  tags: ['api', 'case-management', 'users'],
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
    const user = await retry(
      async (bail) => {
        // Mock implementation - simulate API call
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Use test data for demonstration
        return testUsers.find(
          (testUser) =>
            testUser.emailAddress.toLowerCase() === emailAddress.toLowerCase()
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

    const response = new HTTPArrayResponse({
      self: 'case-management/users/find'
    })

    if (user) {
      response.add(new HTTPObjectResponse('case-management-user', user.id, {}))
    }

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

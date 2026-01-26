import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'
import retry from 'async-retry'

import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../lib/http/http-exception.js'

import {
  HTTPArrayResponse,
  HTTPObjectResponse
} from '../../lib/http/http-response.js'
import { LinksReference } from '../../types/links.js'
import { salesforceClient } from '../../lib/salesforce/client.js'
import {
  Case,
  CreateCasePayloadSchema
} from '../../types/case-management/case.js'
import { buildCaseCreationCompositeRequest } from '../../lib/salesforce/composite-request-builder.js'

/**
 * @import {CreateCasePayload} from '../../types/case-management/case.js'
 */

const PostCreateCaseResponseSchema = Joi.object({
  data: Joi.array().items(Case).required(),
  links: LinksReference
})
  .description('Case Management Case Details')
  .label('Create Case Response')

const __dirname = new URL('.', import.meta.url).pathname

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: false,
  tags: ['api', 'case-management', 'case'],
  description: 'Create a case in Salesforce',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), 'case.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'case-management-case-create',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    payload: CreateCasePayloadSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning'),
      'Content-Type': Joi.string().allow('application/json')
    }).options({ allowUnknown: true }),
    failAction: (request, h, error) =>
      HTTPException.failValidation(request, h, error)
  },
  response: {
    status: {
      200: PostCreateCaseResponseSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

/**
 * @type {import('@hapi/hapi').Lifecycle.Method}
 */
async function handler(request, h) {
  const payload = /** @type {CreateCasePayload} */ (request.payload)
  const compositeRequest = buildCaseCreationCompositeRequest(payload)

  try {
    const salesforceResponse = await retry(
      async () => {
        return await salesforceClient.sendComposite(
          compositeRequest,
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

    const compositeResponse = salesforceResponse?.compositeResponse
    const failedCompositeItems = Array.isArray(compositeResponse)
      ? compositeResponse.filter(
          (item) =>
            item?.httpStatusCode && ![200, 201].includes(item.httpStatusCode)
        )
      : []

    if (failedCompositeItems.length > 0) {
      const compositeError = /** @type {Error & {failedItems: any[]}} */ (
        new Error('One or more composite operations failed')
      )
      compositeError.name = 'CompositeOperationError'
      compositeError.failedItems = failedCompositeItems
      throw compositeError
    }

    const response = new HTTPArrayResponse({
      self: 'case-management/case'
    })

    if (salesforceResponse) {
      response.add(
        new HTTPObjectResponse(
          'case-management-case',
          payload.applicationReferenceNumber,
          salesforceResponse
        )
      )
    }

    return h.response(response.toResponse()).code(201)
  } catch (error) {
    if (error.name === 'CompositeOperationError') {
      const failedOperations = error.failedItems.map((item) => ({
        referenceId: item.referenceId,
        httpStatusCode: item.httpStatusCode,
        errors: Array.isArray(item.body)
          ? item.body.map((err) => ({
              errorCode: err.errorCode,
              message: err.message
            }))
          : []
      }))

      request.logger?.error(
        {
          endpoint: 'case-management/case',
          failedOperations
        },
        'Composite operations failed in Salesforce'
      )
    } else {
      request.logger?.error(
        {
          err: error,
          endpoint: 'case-management/case'
        },
        'Failed to create case in Salesforce'
      )
    }

    return new HTTPException(
      'INTERNAL_SERVER_ERROR',
      'Your request could not be processed',
      [
        new HTTPError(
          'INTERNAL_SERVER_ERROR',
          'Could not create case on the case management service'
        )
      ]
    ).boomify()
  }
}

export default {
  method: 'POST',
  path: '/case-management/case',
  handler,
  options
}

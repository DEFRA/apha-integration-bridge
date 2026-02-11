import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'
import retry from 'async-retry'

import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../../lib/http/http-exception.js'
import { salesforceClient } from '../../../lib/salesforce/client.js'
import { CreateCasePayloadSchema } from '../../../types/case-management/case.js'
import {
  buildCaseCreationCompositeRequest,
  refIdApplicationRef
} from '../../../lib/salesforce/composite-request-builder.js'
import { buildCustomerCreationPayload } from '../../../lib/salesforce/customer-creation-request-builder.js'
import { buildCaseCreationPayload } from '../../../lib/salesforce/case-creation-request-builder.js'
import { getUserEmail } from '../../../common/helpers/user-context.js'

/**
 * @import {CreateCasePayload, GuestCustomerDetails} from '../../../types/case-management/case.js'
 * @import {Request} from '@hapi/hapi'
 */

const __dirname = new URL('.', import.meta.url).pathname
const retriesConfig = {
  retries: 3,
  maxRetryTime: 10000,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 4000
}

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: false,
  tags: ['api', 'case-management'],
  description: 'Create a case in APHA CRM (Salesforce)',
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
      201: Joi.any().allow(null, '').optional().description('No content'),
      '400-500': HTTPExceptionSchema
    }
  }
}

/**
 * @type {import('@hapi/hapi').Lifecycle.Method}
 */
async function handler(request, h) {
  await runCaseCreationFlow(request, async () => {
    const [applicationId, customerId] = await Promise.all([
      createApplication(request),
      createCustomerAccount(request)
    ])

    await createCase(request, applicationId, customerId)
  })

  return h.response().code(201)
}

/**
 * @param {Request} request
 * @param {() => Promise<void>} action
 */
async function runCaseCreationFlow(request, action) {
  try {
    await action()
  } catch (error) {
    handleCaseCreationError(error, request)
  }
}

/**
 * @param {Request} request
 * @param {string} applicationId
 * @param {string} customerId
 * @returns {Promise<void>}
 */
async function createCase(request, applicationId, customerId) {
  const payload = /** @type {CreateCasePayload} */ (request.payload)
  const applicationReference = payload.applicationReferenceNumber
  const createCasePayload = buildCaseCreationPayload(applicationId, customerId)

  await retry(async () => {
    return await salesforceClient.createCase(
      createCasePayload,
      applicationReference,
      request.logger
    )
  }, retriesConfig)
}

/**
 * @param {Request} request
 * @returns {Promise<string|null>}
 */
async function createApplication(request) {
  const payload = /** @type {CreateCasePayload} */ (request.payload)
  const compositeRequest = buildCaseCreationCompositeRequest(payload)
  const userEmail = getUserEmail(request)

  const salesforceResponse = await retry(async () => {
    return await salesforceClient.sendComposite(
      compositeRequest,
      request.logger,
      userEmail
    )
  }, retriesConfig)

  const compositeResponse = salesforceResponse?.compositeResponse
  const failedCompositeItems = Array.isArray(compositeResponse)
    ? compositeResponse.filter(
        (item) =>
          item?.httpStatusCode && ![200, 201].includes(item.httpStatusCode)
      )
    : []

  if (failedCompositeItems.length > 0 || !Array.isArray(compositeResponse)) {
    const compositeError = /** @type {Error & {failedItems: any[]}} */ (
      new Error('One or more composite operations failed')
    )
    compositeError.name = 'CompositeOperationError'
    compositeError.failedItems = failedCompositeItems
    throw compositeError
  }
  return (
    compositeResponse.find((item) => item.referenceId === refIdApplicationRef)
      ?.body?.id || null
  )
}
/**
 * @param {Request} request
 * @returns {Promise<string|null>}
 */

async function createCustomerAccount(request) {
  const payload = /** @type {CreateCasePayload} */ (request.payload)
  const applicant = /** @type {GuestCustomerDetails} */ (payload.applicant)
  const customerCreationPayload = buildCustomerCreationPayload(applicant)
  const userEmail = getUserEmail(request)

  const salesforceResponse = await retry(async () => {
    return await salesforceClient.createCustomer(
      customerCreationPayload,
      request.logger,
      userEmail
    )
  }, retriesConfig)

  return salesforceResponse?.id || null
}

function handleCaseCreationError(error, request) {
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
  throw new HTTPException(
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

export default {
  method: 'POST',
  path: '/case-management/case',
  handler,
  options
}

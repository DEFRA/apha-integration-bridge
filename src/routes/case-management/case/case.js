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
import { buildApplicationCreationCompositeRequest } from '../../../lib/salesforce/request-builders/application-creation-request-builder.js'
import { buildCustomerCreationPayload } from '../../../lib/salesforce/request-builders/customer-creation-request-builder.js'
import { buildCaseCreationPayload } from '../../../lib/salesforce/request-builders/case-creation-request-builder.js'
import { buildSupportingMaterialsCompositeRequest } from '../../../lib/salesforce/request-builders/supporting-materials-request-builder.js'
import { refIdApplicationRef } from '../../../lib/salesforce/request-builders/file-upload-request-builder.js'
import { buildApplicationFileCompositeRequest } from '../../../lib/salesforce/request-builders/application-file-request-builder.js'
import { CaseStatus } from '../../../types/salesforce/case-status.js'
import { buildKeyFactsRequest } from '../../../lib/salesforce/request-builders/key-facts-creation-request-builder.js'

/**
 * @import {CreateCasePayload, GuestCustomerDetails, UpdateCaseDetailsPayload} from '../../../types/case-management/case.js'
 * @import {Request} from '@hapi/hapi'
 * @import {Logger} from 'pino'
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
  auth: {
    mode: 'required'
  },
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
      createApplicationAndFile(request),
      createCustomerAccount(request)
    ])

    const caseId = await createCase(request, applicationId, customerId)
    await Promise.all([
      uploadSupportingMaterials(request, caseId),
      addKeyFacts(request, applicationId)
    ])
    await updateCaseStatus(request, CaseStatus.NEW)
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
 * @returns {Promise<string|null>}
 */
async function createCase(request, applicationId, customerId) {
  const payload = /** @type {CreateCasePayload} */ (request.payload)
  const applicationReference = payload.applicationReferenceNumber
  const createCasePayload = buildCaseCreationPayload(applicationId, customerId)

  const salesforceResponse = await retry(async () => {
    return await salesforceClient.createOrUpdateCase(
      createCasePayload,
      applicationReference,
      request.logger
    )
  }, retriesConfig)

  return salesforceResponse.id || null
}

/**
 * @param {Request} request
 * @param {string} status
 */
async function updateCaseStatus(request, status) {
  const payload = /** @type {CreateCasePayload} */ (request.payload)
  const applicationReference = payload.applicationReferenceNumber
  const updateCasePayload = /** @type {UpdateCaseDetailsPayload} */ ({
    Status: status
  })

  await retry(async () => {
    return await salesforceClient.createOrUpdateCase(
      updateCasePayload,
      applicationReference,
      request.logger
    )
  }, retriesConfig)
}

/**
 * @param {Request} request
 * @param {string} applicationId
 */
async function addKeyFacts(request, applicationId) {
  const existingKeyFacts = await getKeyFacts(request, applicationId)
  if (existingKeyFacts.length === 0) {
    const keyFactsRequest = buildKeyFactsRequest(
      /** @type {CreateCasePayload} */ (request.payload)
    )
    await retry(async () => {
      return await salesforceClient.addKeyFacts(keyFactsRequest, request.logger)
    }, retriesConfig)
  }
}

/**
 * @param {Request} request
 * @param {string} applicationId
 * @returns {Promise<any[]>}
 */
async function getKeyFacts(request, applicationId) {
  const salesforceResponse = await retry(async () => {
    return await salesforceClient.getKeyFacts(applicationId, request.logger)
  }, retriesConfig)
  return salesforceResponse?.records || []
}

/**
 * @param {Request} request
 * @returns {Promise<string|null>}
 */
async function createApplicationAndFile(request) {
  const applicationId = await createApplication(request)

  if (applicationId) {
    const files = await getLinkedFiles(request, applicationId)
    if (files.length === 0) {
      await uploadApplicationFile(request, applicationId)
    }
  }

  return applicationId
}

/**
 * @param {Request} request
 * @returns {Promise<string|null>}
 */
async function createApplication(request) {
  const payload = /** @type {CreateCasePayload} */ (request.payload)
  const compositeRequest = buildApplicationCreationCompositeRequest(payload)

  const salesforceResponse = await retry(async () => {
    return await salesforceClient.sendComposite(
      compositeRequest,
      request.logger
    )
  }, retriesConfig)

  const compositeResponse = handleCompositeResponse(salesforceResponse)
  return (
    compositeResponse.find((item) => item.referenceId === refIdApplicationRef)
      ?.body?.id || null
  )
}

/**
 * @param {Request} request
 * @param {string} applicationId
 * @returns {Promise<any[]>}
 */
async function getLinkedFiles(request, applicationId) {
  const salesforceResponse = await retry(async () => {
    return await salesforceClient.getLinkedFiles(applicationId, request.logger)
  }, retriesConfig)
  return salesforceResponse?.records || []
}

/**
 * @param {Request} request
 * @param {string} applicationId
 */
async function uploadApplicationFile(request, applicationId) {
  const payload = /** @type {CreateCasePayload} */ (request.payload)
  const compositeRequest = buildApplicationFileCompositeRequest(
    payload,
    applicationId
  )

  const salesforceResponse = await retry(async () => {
    return await salesforceClient.sendComposite(
      compositeRequest,
      request.logger
    )
  }, retriesConfig)

  handleCompositeResponse(salesforceResponse)
}

/**
 * @param {string} caseId
 * @param {string} sectionKey
 * @param {string} questionKey
 * @param {string} filePath
 * @param {Logger} logger
 */
async function uploadCaseFile(
  caseId,
  sectionKey,
  questionKey,
  filePath,
  logger
) {
  const compositeRequest = await buildSupportingMaterialsCompositeRequest(
    caseId,
    sectionKey,
    questionKey,
    filePath
  )

  const salesforceResponse = await retry(async () => {
    return await salesforceClient.sendComposite(compositeRequest, logger)
  }, retriesConfig)

  handleCompositeResponse(salesforceResponse)
}

/**
 * @param {object} salesforceResponse
 * @returns {object[]}
 * @throws {Error} Throws an error if any composite operation failed
 */
function handleCompositeResponse(salesforceResponse) {
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
  return compositeResponse
}
/**
 * @param {Request} request
 * @returns {Promise<string|null>}
 */
async function createCustomerAccount(request) {
  const payload = /** @type {CreateCasePayload} */ (request.payload)
  const applicant = /** @type {GuestCustomerDetails} */ (payload.applicant)
  const customerCreationPayload = buildCustomerCreationPayload(applicant)

  const salesforceResponse = await retry(async () => {
    return await salesforceClient.createCustomer(
      customerCreationPayload,
      request.logger
    )
  }, retriesConfig)

  return salesforceResponse?.id || null
}

/**
 * @param {Request} request
 * @param {string} caseId
 * @returns {Promise<void>}
 */
async function uploadSupportingMaterials(request, caseId) {
  const payload = /** @type {CreateCasePayload} */ (request.payload)
  const caseFiles = await getLinkedFiles(request, caseId)
  for (const section of payload.sections) {
    for (const questionAnswer of section.questionAnswers) {
      if (
        questionAnswer.answer.type === 'file' &&
        questionAnswer.answer.value.path
      ) {
        const filePath = questionAnswer.answer.value.path
        const isFileAlreadyUploaded = caseFiles.some(
          (file) => file.ContentDocument.Title === filePath
        )
        if (!isFileAlreadyUploaded) {
          await uploadCaseFile(
            caseId,
            section.sectionKey,
            questionAnswer.questionKey,
            filePath,
            request.logger
          )
        }
      }
    }
  }
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

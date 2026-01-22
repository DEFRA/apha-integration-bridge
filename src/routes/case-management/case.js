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
import { Case } from '../../types/case-management/case.js'

const PostCreateCaseResponseSchema = Joi.object({
  data: Joi.array().items(Case).required(),
  links: LinksReference
})
  .description('Case Management Case Details')
  .label('Create Case Response')

// const CompositeRequestItemSchema = Joi.object({
//   method: Joi.string()
//     .valid('GET', 'POST', 'PATCH', 'PUT', 'DELETE')
//     .required()
//     .description('HTTP method for the composite request'),
//   url: Joi.string().required().description('Salesforce API endpoint URL'),
//   referenceId: Joi.string()
//     .required()
//     .description('Reference ID to identify this sub-request'),
//   body: Joi.object()
//     .unknown(true)
//     .optional()
//     .description('Request body for POST/PATCH/PUT requests')
// })
//   .description('Individual composite request item')
//   .label('Composite Request Item')

// const CreateCasePayloadSchema = Joi.object({
//   reference: Joi.string()
//     .required()
//     .description('Reference ID for the case')
//     .description('Case creation API request payload')
//     .label('Create Case Request')
// })

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
    // payload: CreateCasePayloadSchema,
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
  const compositeRequest = buildCaseCreationCompositeRequest(request)

  try {
    const result = await retry(
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

    const response = new HTTPArrayResponse({
      self: 'case-management/case'
    })

    if (result) {
      response.add(
        new HTTPObjectResponse('case-management-case', 'TB-AB12-345689', result)
      )
    }

    return h.response(response.toResponse()).code(200)
  } catch (error) {
    request.logger?.error(
      {
        err: error,
        endpoint: 'case-management/case'
      },
      'Failed to create case in Salesforce'
    )

    return new HTTPException(
      'INTERNAL_SERVER_ERROR',
      'Your request could not be processed',
      [
        new HTTPError(
          'DATABASE_ERROR',
          'Cannot create case successfully on the case management service'
        )
      ]
    ).boomify()
  }
}

function buildCaseCreationCompositeRequest(event, options = {}) {
  const licenceTypeRequest = buildLicenceTypeRequest()
  const createIndividualApplicationRequest = buildCreateApplicationRequest()
  const uploadFileRequest = buildUploadFileRequest()
  const fileIdRequest = buildFileIdRequest()
  const linkFileRequest = buildLinkFileRequest()

  return {
    allOrNone: true,
    compositeRequest: [
      licenceTypeRequest,
      createIndividualApplicationRequest,
      uploadFileRequest,
      fileIdRequest,
      linkFileRequest
    ]
  }
}

function buildLicenceTypeRequest() {
  return {
    method: 'GET',
    url: "/services/data/v62.0/query?q=SELECT+Id+FROM+RegulatoryAuthorizationType+WHERE+Name='TB15'+LIMIT+1",
    referenceId: 'licenseTypeQuery'
  }
}

function buildCreateApplicationRequest() {
  return {
    method: 'PATCH',
    url: '/services/data/v62.0/sobjects/IndividualApplication/APHA_ExternalReferenceNumber__c/TB-AB12-345689',
    referenceId: 'applicationRef',
    body: {
      Category: 'License',
      LicenseTypeId: '@{licenseTypeQuery.records[0].Id}'
    }
  }
}

function buildUploadFileRequest() {
  return {
    method: 'POST',
    url: '/services/data/v62.0/sobjects/ContentVersion',
    referenceId: 'file',
    body: {
      Title: 'TB-AB12-34567-v2.0',
      PathOnClient: 'TB-AB12-34567-v2.0.json',
      VersionData: 'iVBORw0KGgoAAAANSUhEUgAA...'
    }
  }
}

function buildFileIdRequest() {
  return {
    method: 'GET',
    url: '/services/data/v62.0/sobjects/ContentVersion/@{file.id}?fields=ContentDocumentId',
    referenceId: 'fileQuery'
  }
}

function buildLinkFileRequest() {
  return {
    method: 'POST',
    url: '/services/data/v62.0/sobjects/ContentDocumentLink',
    referenceId: 'linkfile',
    body: {
      LinkedEntityId: '@{applicationRef.id}',
      ContentDocumentId: '@{fileQuery.ContentDocumentId}',
      ShareType: 'V',
      Visibility: 'AllUsers'
    }
  }
}

export default {
  method: 'POST',
  path: '/case-management/case',
  handler,
  options
}

// {
//     "allOrNone": true,
//     "compositeRequest": [
//         {
//             "method": "GET",
//             "url": "/services/data/v62.0/query?q=SELECT+Id+FROM+RegulatoryAuthorizationType+WHERE+Name='TB15'+LIMIT+1", //licenceType
//             "referenceId": "licenseTypeQuery"
//         },
//         {
//             "method": "PATCH",
//             "url": "/services/data/v62.0/sobjects/IndividualApplication/APHA_ExternalReferenceNumber__c/TB-AB12-345689", //Applicantion Refren
//             "referenceId": "applicationRef",
//             "body": {
//                 "Category": "License",
//                 "LicenseTypeId": "@{licenseTypeQuery.records[0].Id}"
//             }
//         },
//         {
//             "method": "POST",
//             "url": "/services/data/v62.0/sobjects/ContentVersion",
//             "referenceId": "file",
//             "body": {
//                 "Title": "TB-AB12-34567-v2.0", //Applicantion Reference
//                 "PathOnClient": "TB-AB12-34567-v2.0.json", //Applicantion Reference
//                 "VersionData": "iVBORw0KGgoAAAANSUhEUgAA..." //Base64 encoded file data
//             }
//         },
//         {
//             "method": "GET",
//             "url": "/services/data/v62.0/sobjects/ContentVersion/@{file.id}?fields=ContentDocumentId",
//             "referenceId": "fileQuery"
//         },
//         {
//             "method": "POST",
//             "url": "/services/data/v62.0/sobjects/ContentDocumentLink",
//             "referenceId": "linkfile",
//             "body": {
//                 "LinkedEntityId": "@{applicationRef.id}",
//                 "ContentDocumentId": "@{fileQuery.ContentDocumentId}",
//                 "ShareType": "V",
//                 "Visibility": "AllUsers"
//             }
//         }
//     ]
// }

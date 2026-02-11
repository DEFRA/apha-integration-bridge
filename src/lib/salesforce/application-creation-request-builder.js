import { config } from '../../config.js'
import {
  buildFileIdRequest,
  buildFileUploadRequest,
  buildLinkFileRequest,
  refIdApplicationRef
} from './file-upload-request-builder.js'

/**
 * @import {CompositeRequest, CompositeRequestItem} from '../../types/salesforce/composite-request.js'
 * @import {CreateCasePayload} from '../../types/case-management/case.js'
 */

const salesforceConfig = config.get('salesforce')
const refIdLicenseTypeQuery = 'licenseTypeQuery'

/**
 * @param {CreateCasePayload} payload
 * @returns {CompositeRequest}
 */
export function buildApplicationCreationCompositeRequest(payload) {
  const licenceTypeRequest = buildLicenceTypeRequest(payload)
  const createIndividualApplicationRequest =
    buildCreateApplicationRequest(payload)
  const fileUploadRequest = buildFileUploadRequest(
    Buffer.from(JSON.stringify(payload)).toString('base64'),
    `${payload.applicationReferenceNumber}-v2.0`,
    `${payload.applicationReferenceNumber}-v2.0.json`
  )
  const fileIdRequest = buildFileIdRequest()
  const linkFileRequest = buildLinkFileRequest()

  return {
    allOrNone: true,
    compositeRequest: [
      licenceTypeRequest,
      createIndividualApplicationRequest,
      fileUploadRequest,
      fileIdRequest,
      linkFileRequest
    ]
  }
}

/**
 *
 * @param {CreateCasePayload} payload
 * @returns {CompositeRequestItem}
 */
function buildLicenceTypeRequest(payload) {
  return {
    method: 'GET',
    url: `/services/data/${salesforceConfig.apiVersion}/query?q=SELECT+Id+FROM+RegulatoryAuthorizationType+WHERE+Name='${payload.keyFacts.licenceType}'+LIMIT+1`,
    referenceId: refIdLicenseTypeQuery
  }
}

/**
 *
 * @param {CreateCasePayload} payload
 * @returns {CompositeRequestItem}
 */
function buildCreateApplicationRequest(payload) {
  return {
    method: 'PATCH',
    url: `/services/data/${salesforceConfig.apiVersion}/sobjects/IndividualApplication/APHA_ExternalReferenceNumber__c/${payload.applicationReferenceNumber}`,
    referenceId: refIdApplicationRef,
    body: {
      Category: 'License',
      LicenseTypeId: `@{${refIdLicenseTypeQuery}.records[0].Id}`
    }
  }
}

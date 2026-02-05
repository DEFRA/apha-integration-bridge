import { config } from '../../config.js'

/**
 * @import {CompositeRequest, CompositeRequestItem} from '../../types/salesforce/composite-request.js'
 * @import {CreateCasePayload} from '../../types/case-management/case.js'
 */

const salesforceConfig = config.get('salesforce')
const refIdLicenseTypeQuery = 'licenseTypeQuery'
const refIdFile = 'file'
const refIdFileQuery = 'fileQuery'
const refIdLinkFile = 'linkFile'

export const refIdApplicationRef = 'applicationRef'

/**
 * @param {CreateCasePayload} payload
 * @returns {CompositeRequest}
 */
export function buildCaseCreationCompositeRequest(payload) {
  const licenceTypeRequest = buildLicenceTypeRequest(payload)
  const createIndividualApplicationRequest =
    buildCreateApplicationRequest(payload)
  const uploadFileRequest = buildUploadFileRequest(payload)
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

/**
 *
 * @param {CreateCasePayload} payload
 * @returns {CompositeRequestItem}
 */
function buildUploadFileRequest(payload) {
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')

  return {
    method: 'POST',
    url: `/services/data/${salesforceConfig.apiVersion}/sobjects/ContentVersion`,
    referenceId: refIdFile,
    body: {
      Title: `${payload.applicationReferenceNumber}-v2.0`,
      PathOnClient: `${payload.applicationReferenceNumber}-v2.0.json`,
      VersionData: base64Payload
    }
  }
}

/**
 * @returns {CompositeRequestItem}
 */
function buildFileIdRequest() {
  return {
    method: 'GET',
    url: `/services/data/${salesforceConfig.apiVersion}/sobjects/ContentVersion/@{${refIdFile}.id}?fields=ContentDocumentId`,
    referenceId: refIdFileQuery
  }
}

/**
 * @returns {CompositeRequestItem}
 */
function buildLinkFileRequest() {
  return {
    method: 'POST',
    url: `/services/data/${salesforceConfig.apiVersion}/sobjects/ContentDocumentLink`,
    referenceId: refIdLinkFile,
    body: {
      LinkedEntityId: `@{${refIdApplicationRef}.id}`,
      ContentDocumentId: `@{${refIdFileQuery}.ContentDocumentId}`,
      ShareType: 'V',
      Visibility: 'AllUsers'
    }
  }
}

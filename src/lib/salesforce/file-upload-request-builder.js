import { config } from '../../config.js'

/**
 * @import {CompositeRequestItem} from '../../types/salesforce/composite-request.js'
 */

export const refIdFile = 'file'
export const refIdFileQuery = 'fileQuery'
export const refIdLinkFile = 'linkFile'
export const refIdApplicationRef = 'applicationRef'

const salesforceConfig = config.get('salesforce')

/**
 * @param {string} base64Payload
 * @param {string} title
 * @param {string} path
 * @returns {CompositeRequestItem}
 */
export function buildFileUploadRequest(base64Payload, title, path) {
  return {
    method: 'POST',
    url: `/services/data/${salesforceConfig.apiVersion}/sobjects/ContentVersion`,
    referenceId: refIdFile,
    body: {
      Title: title,
      PathOnClient: path,
      VersionData: base64Payload
    }
  }
}

/**
 * @returns {CompositeRequestItem}
 */
export function buildFileIdRequest() {
  return {
    method: 'GET',
    url: `/services/data/${salesforceConfig.apiVersion}/sobjects/ContentVersion/@{${refIdFile}.id}?fields=ContentDocumentId`,
    referenceId: refIdFileQuery
  }
}

/**
 * @returns {CompositeRequestItem}
 */
export function buildLinkFileRequest() {
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

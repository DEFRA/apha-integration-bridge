import { buildFileUploadAndLinkCompositeRequest } from './file-upload-and-link-request-builder.js'

/**
 * @import {CompositeRequest} from '../../types/salesforce/composite-request.js'
 * @import {CreateCasePayload} from '../../types/case-management/case.js'
 */

/**
 * @param {CreateCasePayload} payload
 * @param {string} applicationId
 * @returns {CompositeRequest}
 */
export function buildApplicationFileCompositeRequest(payload, applicationId) {
  return buildFileUploadAndLinkCompositeRequest(
    Buffer.from(JSON.stringify(payload)).toString('base64'),
    payload.applicationReferenceNumber,
    `${payload.applicationReferenceNumber}.json`,
    applicationId
  )
}

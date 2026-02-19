import {
  buildFileIdRequest,
  buildFileUploadRequest,
  buildLinkFileRequest
} from './file-upload-request-builder.js'

/**
 * @param {string} base64Payload
 * @param {string} title
 * @param {string} path
 * @param {string} linkedEntityId
 * @returns
 */
export function buildFileUploadAndLinkCompositeRequest(
  base64Payload,
  title,
  path,
  linkedEntityId
) {
  const fileUploadRequest = buildFileUploadRequest(base64Payload, title, path)
  const fileIdRequest = buildFileIdRequest()
  const linkFileRequest = buildLinkFileRequest(linkedEntityId)

  return {
    allOrNone: true,
    compositeRequest: [fileUploadRequest, fileIdRequest, linkFileRequest]
  }
}

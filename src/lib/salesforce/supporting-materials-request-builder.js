import { fetchFile } from '../../common/helpers/file/file-utils.js'
import { config } from '../../config.js'
import {
  buildFileUploadRequest,
  refIdApplicationRef,
  refIdFile,
  refIdFileQuery,
  refIdLinkFile
} from './file-upload-request-builder.js'

/**
 * @import {CompositeRequest, CompositeRequestItem} from '../../types/salesforce/composite-request.js'
 */

const salesforceConfig = config.get('salesforce')

/**
 * @param {string} caseId
 * @param {string} sectionKey
 * @param {string} questionKey
 * @param {string} filePath
 * @returns {Promise<CompositeRequest>}
 */
export async function buildSupportingMaterialsCompositeRequest(
  caseId,
  sectionKey,
  questionKey,
  filePath
) {
  const fileData = await fetchFile(filePath)
  const fileUploadRequest = buildFileUploadRequest(
    fileData.file.toString('base64'),
    questionKey,
    `${sectionKey}.${questionKey}.${fileData.extension}`
  )
  const fileIdRequest = buildFileIdRequest()
  const linkFileRequest = buildLinkFileRequest(caseId)

  return {
    allOrNone: true,
    compositeRequest: [fileUploadRequest, fileIdRequest, linkFileRequest]
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
 * @parasm {string} linkedEntityId
 * @returns {CompositeRequestItem}
 */
function buildLinkFileRequest(linkedEntityId = `@{${refIdApplicationRef}.id}`) {
  return {
    method: 'POST',
    url: `/services/data/${salesforceConfig.apiVersion}/sobjects/ContentDocumentLink`,
    referenceId: refIdLinkFile,
    body: {
      LinkedEntityId: linkedEntityId,
      ContentDocumentId: `@{${refIdFileQuery}.ContentDocumentId}`,
      ShareType: 'V',
      Visibility: 'AllUsers'
    }
  }
}

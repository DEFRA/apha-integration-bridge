import { fetchFile } from '../../../common/helpers/file/file-utils.js'
import { buildFileUploadAndLinkCompositeRequest } from './file-upload-and-link-request-builder.js'

/**
 * @import {CompositeRequest} from '../../../types/salesforce/composite-request.js'
 */

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
  return buildFileUploadAndLinkCompositeRequest(
    fileData.file.toString('base64'),
    filePath,
    `${sectionKey}.${questionKey}.${fileData.extension}`,
    caseId
  )
}

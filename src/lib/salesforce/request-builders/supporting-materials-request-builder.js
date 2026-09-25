import { fetchFile } from '../../../common/helpers/file/file-utils.js'
import { salesforceTaggedError } from '../errors/error-helpers.js'
import { buildFileUploadAndLinkCompositeRequest } from './file-upload-and-link-request-builder.js'

/**
 * @import {CompositeRequest} from '../../../types/salesforce/composite-request.js'
 */

/**
 * @param {string} caseId
 * @param {string} title
 * @param {string} filePath
 * @returns {Promise<CompositeRequest>}
 */
export async function buildSupportingMaterialsCompositeRequest(
  caseId,
  title,
  filePath
) {
  let fileData
  try {
    fileData = await fetchFile(filePath)
  } catch (error) {
    throw salesforceTaggedError(
      'Upload supporting materials failed. Unable to retrieve the file.',
      'buildSupportingMaterialsCompositeRequest'
    )
  }
  return buildFileUploadAndLinkCompositeRequest(
    fileData.file.toString('base64'),
    title,
    `${filePath}.${fileData.extension}`,
    caseId
  )
}

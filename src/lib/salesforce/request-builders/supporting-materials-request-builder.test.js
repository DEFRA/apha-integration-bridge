import { describe, test, expect, jest, beforeEach } from '@jest/globals'

import { buildSupportingMaterialsCompositeRequest } from './supporting-materials-request-builder.js'
import * as fileUploadAndLinkRequestBuilder from './file-upload-and-link-request-builder.js'
import * as fileUtils from '../../../common/helpers/file/file-utils.js'
import { salesforceTaggedError } from '../errors/error-helpers.js'

const mockCompositeRequest = /** @type {any} */ ({
  allOrNone: true,
  compositeRequest: [
    { referenceId: 'file' },
    { referenceId: 'fileQuery' },
    { referenceId: 'linkFile' }
  ]
})

const mockFileData = {
  file: Buffer.from('mock file content'),
  extension: 'pdf'
}

const mockFetchFile = jest
  .spyOn(fileUtils, 'fetchFile')
  .mockResolvedValue(mockFileData)

jest
  .spyOn(
    fileUploadAndLinkRequestBuilder,
    'buildFileUploadAndLinkCompositeRequest'
  )
  .mockReturnValue(mockCompositeRequest)

describe('buildSupportingMaterialsCompositeRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should fetch file and then call buildFileUploadAndLinkCompositeRequest with correct parameters and return the result', async () => {
    const caseId = 'case-456'
    const keyFact = 'fileKeyFact'
    const filePath = '/s3/path/to/document'
    const expectedTitle = 'fileKeyFact'
    const expectedPath = '/s3/path/to/document.pdf'

    const result = await buildSupportingMaterialsCompositeRequest(
      caseId,
      keyFact,
      filePath
    )

    const expectedBase64 = mockFileData.file.toString('base64')

    expect(fileUtils.fetchFile).toHaveBeenCalledWith(filePath)
    expect(
      fileUploadAndLinkRequestBuilder.buildFileUploadAndLinkCompositeRequest
    ).toHaveBeenCalledWith(expectedBase64, expectedTitle, expectedPath, caseId)
    expect(result).toBe(mockCompositeRequest)
  })

  test('should throw an error if fetchFile fails', async () => {
    const caseId = 'case-456'
    const keyFact = 'fileKeyFact'
    const filePath = '/s3/path/to/document'

    mockFetchFile.mockRejectedValueOnce(new Error('Failed to fetch file'))

    await expect(
      buildSupportingMaterialsCompositeRequest(caseId, keyFact, filePath)
    ).rejects.toThrow(
      salesforceTaggedError(
        'Upload supporting materials failed. Unable to retrieve the file.',
        'buildSupportingMaterialsCompositeRequest'
      )
    )
  })
})

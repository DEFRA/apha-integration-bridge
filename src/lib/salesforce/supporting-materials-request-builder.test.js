import { describe, test, expect, jest, beforeEach } from '@jest/globals'

import { buildSupportingMaterialsCompositeRequest } from './supporting-materials-request-builder.js'
import * as fileUploadAndLinkRequestBuilder from './file-upload-and-link-request-builder.js'
import * as fileUtils from '../../common/helpers/file/file-utils.js'

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

jest.spyOn(fileUtils, 'fetchFile').mockResolvedValue(mockFileData)

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
    const sectionKey = 'section-2'
    const questionKey = 'question-2'
    const filePath = '/path/to/document.pdf'

    const result = await buildSupportingMaterialsCompositeRequest(
      caseId,
      sectionKey,
      questionKey,
      filePath
    )

    const expectedBase64 = mockFileData.file.toString('base64')
    const expectedPath = `${sectionKey}.${questionKey}.${mockFileData.extension}`

    expect(fileUtils.fetchFile).toHaveBeenCalledWith(filePath)
    expect(
      fileUploadAndLinkRequestBuilder.buildFileUploadAndLinkCompositeRequest
    ).toHaveBeenCalledWith(expectedBase64, filePath, expectedPath, caseId)
    expect(result).toBe(mockCompositeRequest)
  })
})

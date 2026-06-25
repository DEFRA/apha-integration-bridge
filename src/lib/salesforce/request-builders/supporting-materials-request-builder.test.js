import { describe, test, expect, jest, beforeEach } from '@jest/globals'

import { buildSupportingMaterialsCompositeRequest } from './supporting-materials-request-builder.js'
import { buildFileUploadAndLinkCompositeRequest } from './file-upload-and-link-request-builder.js'
import { fetchFile } from '../../../common/helpers/file/file-utils.js'

// Mock the spied modules with a module-factory that delegates to the real
// implementation by default. `jest.spyOn(import * as ns, fn)` does not reliably
// intercept the call made by the SUT under babel's interop, so we replace the
// module for every importer; only the spied functions become controllable.
jest.mock('./file-upload-and-link-request-builder.js', () => {
  const actual = jest.requireActual('./file-upload-and-link-request-builder.js')
  return {
    __esModule: true,
    ...actual,
    buildFileUploadAndLinkCompositeRequest: jest.fn((...args) =>
      actual.buildFileUploadAndLinkCompositeRequest(...args)
    )
  }
})

jest.mock('../../../common/helpers/file/file-utils.js', () => {
  const actual = jest.requireActual(
    '../../../common/helpers/file/file-utils.js'
  )
  return {
    __esModule: true,
    ...actual,
    fetchFile: jest.fn((...args) => actual.fetchFile(...args))
  }
})

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

describe('buildSupportingMaterialsCompositeRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(fetchFile).mockResolvedValue(mockFileData)
    jest
      .mocked(buildFileUploadAndLinkCompositeRequest)
      .mockReturnValue(mockCompositeRequest)
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

    expect(fetchFile).toHaveBeenCalledWith(filePath)
    expect(buildFileUploadAndLinkCompositeRequest).toHaveBeenCalledWith(
      expectedBase64,
      filePath,
      expectedPath,
      caseId
    )
    expect(result).toBe(mockCompositeRequest)
  })
})

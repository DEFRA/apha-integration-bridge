import { describe, test, expect, jest, beforeEach } from '@jest/globals'

import { buildFileUploadAndLinkCompositeRequest } from './file-upload-and-link-request-builder.js'
import {
  buildFileUploadRequest,
  buildFileIdRequest,
  buildLinkFileRequest
} from './file-upload-request-builder.js'

jest.mock('./file-upload-request-builder.js', () => {
  const actual = jest.requireActual('./file-upload-request-builder.js')
  return {
    __esModule: true,
    ...actual,
    buildFileUploadRequest: jest.fn((...args) =>
      actual.buildFileUploadRequest(...args)
    ),
    buildFileIdRequest: jest.fn((...args) =>
      actual.buildFileIdRequest(...args)
    ),
    buildLinkFileRequest: jest.fn((...args) =>
      actual.buildLinkFileRequest(...args)
    )
  }
})

const base64Payload = 'base64payload'
const title = 'test-title'
const path = 'test-path'
const linkedEntityId = 'linked-entity-id'

const mockFileUploadRequest = {
  referenceId: 'file',
  method: 'POST',
  url: '/file'
}
const mockFileIdRequest = {
  referenceId: 'fileQuery',
  method: 'GET',
  url: '/file-id'
}
const mockLinkFileRequest = {
  referenceId: 'linkFile',
  method: 'POST',
  url: '/link'
}

jest.mocked(buildFileUploadRequest).mockReturnValue(mockFileUploadRequest)
jest.mocked(buildFileIdRequest).mockReturnValue(mockFileIdRequest)
jest.mocked(buildLinkFileRequest).mockReturnValue(mockLinkFileRequest)

describe('buildFileUploadAndLinkCompositeRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should set allOrNone to true and get correct compositeRequest calling each builder function with the correct parameters', () => {
    const result = buildFileUploadAndLinkCompositeRequest(
      base64Payload,
      title,
      path,
      linkedEntityId
    )

    expect(result.allOrNone).toBe(true)
    expect(buildFileUploadRequest).toHaveBeenCalledWith(
      base64Payload,
      title,
      path
    )
    expect(buildFileIdRequest).toHaveBeenCalledWith()
    expect(buildLinkFileRequest).toHaveBeenCalledWith(linkedEntityId)

    expect(result.compositeRequest).toHaveLength(3)
    expect(result.compositeRequest[0]).toBe(mockFileUploadRequest)
    expect(result.compositeRequest[1]).toBe(mockFileIdRequest)
    expect(result.compositeRequest[2]).toBe(mockLinkFileRequest)
  })
})

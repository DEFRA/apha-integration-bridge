import { describe, test, expect, jest, beforeEach } from '@jest/globals'

import { buildFileUploadAndLinkCompositeRequest } from './file-upload-and-link-request-builder.js'
import * as fileUploadRequestBuilder from './file-upload-request-builder.js'

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

jest
  .spyOn(fileUploadRequestBuilder, 'buildFileUploadRequest')
  .mockReturnValue(mockFileUploadRequest)
jest
  .spyOn(fileUploadRequestBuilder, 'buildFileIdRequest')
  .mockReturnValue(mockFileIdRequest)
jest
  .spyOn(fileUploadRequestBuilder, 'buildLinkFileRequest')
  .mockReturnValue(mockLinkFileRequest)

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
    expect(
      fileUploadRequestBuilder.buildFileUploadRequest
    ).toHaveBeenCalledWith(base64Payload, title, path)
    expect(fileUploadRequestBuilder.buildFileIdRequest).toHaveBeenCalledWith()
    expect(fileUploadRequestBuilder.buildLinkFileRequest).toHaveBeenCalledWith(
      linkedEntityId
    )

    expect(result.compositeRequest).toHaveLength(3)
    expect(result.compositeRequest[0]).toBe(mockFileUploadRequest)
    expect(result.compositeRequest[1]).toBe(mockFileIdRequest)
    expect(result.compositeRequest[2]).toBe(mockLinkFileRequest)
  })
})

import { describe, expect, test } from '@jest/globals'
import {
  buildFileIdRequest,
  buildFileUploadRequest,
  buildLinkFileRequest,
  refIdApplicationRef,
  refIdFile,
  refIdFileQuery,
  refIdLinkFile
} from './file-upload-request-builder.js'

describe('file upload request builder', () => {
  const apiVersion = 'v62.0'

  test('buildFileUploadRequest should map payload, title, and path', () => {
    const base64Payload = 'YmFzZTY0LXBheWxvYWQ='
    const title = 'upload-title'
    const path = 'section.question.file.pdf'

    const result = buildFileUploadRequest(base64Payload, title, path)

    expect(result).toEqual({
      method: 'POST',
      url: `/services/data/${apiVersion}/sobjects/ContentVersion`,
      referenceId: refIdFile,
      body: {
        Title: title,
        PathOnClient: path,
        VersionData: base64Payload
      }
    })
  })

  test('buildFileIdRequest should include file query URL and reference', () => {
    const result = buildFileIdRequest()

    expect(result).toEqual({
      method: 'GET',
      url: `/services/data/${apiVersion}/sobjects/ContentVersion/@{${refIdFile}.id}?fields=ContentDocumentId`,
      referenceId: refIdFileQuery
    })
  })

  test('buildLinkFileRequest should link file to application reference', () => {
    const result = buildLinkFileRequest()

    expect(result).toEqual({
      method: 'POST',
      url: `/services/data/${apiVersion}/sobjects/ContentDocumentLink`,
      referenceId: refIdLinkFile,
      body: {
        LinkedEntityId: `@{${refIdApplicationRef}.id}`,
        ContentDocumentId: `@{${refIdFileQuery}.ContentDocumentId}`,
        ShareType: 'V',
        Visibility: 'AllUsers'
      }
    })
  })

  test('build requests should use API version from config', () => {
    const fileRequest = buildFileUploadRequest('payload', 'title', 'path')
    const fileIdRequest = buildFileIdRequest()
    const linkRequest = buildLinkFileRequest()

    expect(fileRequest.url).toContain(`/services/data/${apiVersion}/`)
    expect(fileIdRequest.url).toContain(`/services/data/${apiVersion}/`)
    expect(linkRequest.url).toContain(`/services/data/${apiVersion}/`)
  })
})

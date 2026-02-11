import { beforeEach, describe, expect, test, jest } from '@jest/globals'

import { buildSupportingMaterialsCompositeRequest } from './supporting-materials-request-builder.js'
import {
  refIdFile,
  refIdFileQuery,
  refIdLinkFile
} from './file-upload-request-builder.js'
import { spyOnConfig } from '../../common/helpers/test-helpers/config.js'
import { fetchFile } from '../../common/helpers/file/file-utils.js'

jest.mock('../../common/helpers/file/file-utils.js', () => ({
  fetchFile: jest.fn()
}))

describe('buildSupportingMaterialsCompositeRequest', () => {
  const apiVersion = 'v62.0'

  beforeEach(() => {
    spyOnConfig('salesforce', {
      baseUrl: 'https://salesforce.test',
      authUrl: undefined,
      clientId: 'client-id',
      clientSecret: 'client-secret',
      apiVersion,
      requestTimeoutMs: 1000
    })
  })

  test('should return composite request with upload, id query, and link', async () => {
    const fileBuffer = Buffer.from('file-content')
    jest.mocked(fetchFile).mockResolvedValue({
      file: fileBuffer,
      extension: 'pdf'
    })

    const result = await buildSupportingMaterialsCompositeRequest(
      'CASE-001',
      'section-1',
      'question-1',
      's3/path/file.pdf'
    )

    expect(fetchFile).toHaveBeenCalledWith('s3/path/file.pdf')
    expect(result.allOrNone).toBe(true)
    expect(result.compositeRequest).toHaveLength(3)

    expect(result.compositeRequest[0]).toEqual({
      method: 'POST',
      url: `/services/data/${apiVersion}/sobjects/ContentVersion`,
      referenceId: refIdFile,
      body: {
        Title: 'question-1',
        PathOnClient: 'section-1.question-1.pdf',
        VersionData: fileBuffer.toString('base64')
      }
    })

    expect(result.compositeRequest[1]).toEqual({
      method: 'GET',
      url: `/services/data/${apiVersion}/sobjects/ContentVersion/@{${refIdFile}.id}?fields=ContentDocumentId`,
      referenceId: refIdFileQuery
    })

    expect(result.compositeRequest[2]).toEqual({
      method: 'POST',
      url: `/services/data/${apiVersion}/sobjects/ContentDocumentLink`,
      referenceId: refIdLinkFile,
      body: {
        LinkedEntityId: 'CASE-001',
        ContentDocumentId: `@{${refIdFileQuery}.ContentDocumentId}`,
        ShareType: 'V',
        Visibility: 'AllUsers'
      }
    })
  })

  test('should use API version from config in each sub-request URL', async () => {
    jest.mocked(fetchFile).mockResolvedValue({
      file: Buffer.from('file-content'),
      extension: 'png'
    })

    const result = await buildSupportingMaterialsCompositeRequest(
      'CASE-002',
      'section-2',
      'question-2',
      's3/path/file.png'
    )

    for (const request of result.compositeRequest) {
      expect(request.url).toContain(`/services/data/${apiVersion}/`)
    }
  })
})

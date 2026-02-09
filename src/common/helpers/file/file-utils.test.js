import { jest, describe, test, expect, beforeEach } from '@jest/globals'
import { fetchFile, getFileExtension } from './file-utils.js'
import { config } from '../../../config.js'

jest.mock('@aws-sdk/client-s3')
jest.mock('../../../config.js')
jest.mock('../../connectors/storage/s3.js', () => {
  const { createReadStream } = require('node:fs')
  const path = require('node:path')
  return {
    retrieveFile: jest.fn().mockReturnValue({
      Body: createReadStream(
        path.resolve('./src/common/helpers/file/example.pdf')
      ),
      ContentType: 'application/pdf'
    })
  }
})

const mockUploadedFile = {
  type: 'file',
  value: {
    path: 'mock-s3-key'
  },
  displayText: 'display text'
}

describe('File Utils', () => {
  beforeEach(() => {
    config.get = /** @type{any}*/ (
      jest.fn().mockReturnValue({
        bucket: 'test-bucket'
      })
    )
  })

  describe('fetchFile', () => {
    test('should fetch the files and return extension', async () => {
      const result = await fetchFile(mockUploadedFile.value.path)
      expect(result.extension).toBe('pdf')
    })
  })

  describe('getFileExtension', () => {
    test('should return "pdf" for application/pdf', () => {
      expect(getFileExtension('application/pdf')).toBe('pdf')
    })

    test('should return "jpg" for image/jpeg', () => {
      expect(getFileExtension('image/jpeg')).toBe('jpg')
    })

    test('should return empty string for unknown content type', () => {
      expect(getFileExtension('application/zip')).toBe('')
      expect(getFileExtension('text/plain')).toBe('')
      expect(getFileExtension('')).toBe('')
    })
  })
})

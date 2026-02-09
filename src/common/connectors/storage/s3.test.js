import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach
} from '@jest/globals'
import { mockClient } from 'aws-sdk-client-mock'
import * as s3 from './s3.js'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'

const s3Mock = mockClient(S3Client)

describe('s3 connector', () => {
  beforeEach(() => {
    s3Mock.reset()
  })

  describe('retrieveFile', () => {
    test('should retrieve a file from S3 with the correct parameters', async () => {
      const testPath = 'test/path/to/file.txt'
      s3Mock.on(GetObjectCommand).resolves({})

      await s3.retrieveFile(testPath)

      expect(s3Mock.calls()).toHaveLength(1)
      const command = s3Mock.call(0).args[0]
      expect(command).toBeInstanceOf(GetObjectCommand)

      // @ts-expect-error: input is GetObjectCommandInput in this context
      expect(command.input.Bucket).toBeDefined()
      // @ts-expect-error: input is GetObjectCommandInput in this context
      expect(command.input.Key).toBe(testPath)
    })

    test('should throw an error if S3 retrieval fails', async () => {
      const testPath = 'test/path/to/file.txt'
      s3Mock.on(GetObjectCommand).rejects(new Error('S3 retrieval failed'))

      await expect(s3.retrieveFile(testPath)).rejects.toThrow(
        'S3 retrieval failed'
      )
    })
  })

  describe('closeS3Client', () => {
    afterEach(jest.restoreAllMocks)

    test('should close the client', () => {
      const destroySpy = jest
        .spyOn(s3.client, 'destroy')
        .mockImplementation(() => {})
      s3.closeS3Client()
      expect(destroySpy).toHaveBeenCalled()
    })
  })
})

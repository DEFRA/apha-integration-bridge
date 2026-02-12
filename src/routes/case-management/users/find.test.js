import Hapi from '@hapi/hapi'
import { test, expect, describe, jest, beforeEach } from '@jest/globals'
import hapiPino from 'hapi-pino'
import * as route from './find.js'
import { salesforceClient } from '../../../lib/salesforce/client.js'

const ENDPOINT_PATH = '/case-management/users/find'
const ENDPOINT_METHOD = 'POST'
const TEST_USER_ID = '005ABC123456789'
const MOCK_SALESFORCE_TOKEN = 'mock-salesforce-m2m-token-12345'

const mockSendQuery = jest.spyOn(salesforceClient, 'sendQuery')
const mockGetAccessToken = jest.spyOn(salesforceClient, 'getAccessToken')

beforeEach(() => {
  jest.clearAllMocks()
  mockGetAccessToken.mockResolvedValue(MOCK_SALESFORCE_TOKEN)
})

async function createTestServer() {
  const server = Hapi.server({ port: 0 })

  await server.register([
    {
      plugin: hapiPino,
      options: {
        enabled: false
      }
    }
  ])

  server.route({
    handler: route.default.handler,
    options: route.default.options,
    path: ENDPOINT_PATH,
    method: ENDPOINT_METHOD
  })

  return server
}

/**
 * @param {Hapi.Server} server
 * @param {string} emailAddress
 * @param {Record<string, string>} [headers]
 */
async function findUser(server, emailAddress, headers = {}) {
  return server.inject({
    method: ENDPOINT_METHOD,
    url: ENDPOINT_PATH,
    headers,
    payload: { emailAddress }
  })
}

/**
 * @param {Hapi.ServerInjectResponse} response
 * @param {number} expectedDataLength
 */
function assertSuccessResponse(response, expectedDataLength) {
  expect(response.statusCode).toBe(200)

  const body = /** @type {Record<string, any>} */ (response.result)

  expect(body.data).toBeInstanceOf(Array)
  expect(body.data.length).toBe(expectedDataLength)
  expect(body).toHaveProperty('links')
  expect(body.links).toMatchObject({ self: ENDPOINT_PATH })

  return body
}

function assertUserData(userData) {
  expect(userData).toHaveProperty('type', 'case-management-user')
  expect(userData).toHaveProperty('id')
  expect(userData.id).toBeTruthy()
  expect(typeof userData.id).toBe('string')
}

describe('POST /case-management/users/find', () => {
  describe('Successful user lookup', () => {
    test('returns user when email exists in Salesforce', async () => {
      const server = await createTestServer()

      mockSendQuery.mockResolvedValueOnce({
        records: [{ Id: TEST_USER_ID }],
        totalSize: 1,
        done: true
      })

      const testEmail = 'test.user@example.com'
      const res = await findUser(server, testEmail)

      const body = assertSuccessResponse(res, 1)
      assertUserData(body.data[0])
      expect(body.data[0].id).toBe(TEST_USER_ID)

      expect(mockGetAccessToken).toHaveBeenCalledTimes(1)
      expect(mockSendQuery).toHaveBeenCalledTimes(1)
      expect(mockSendQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT Id FROM User WHERE Username'),
        MOCK_SALESFORCE_TOKEN,
        expect.anything()
      )
      expect(mockSendQuery).toHaveBeenCalledWith(
        expect.stringContaining(testEmail),
        MOCK_SALESFORCE_TOKEN,
        expect.anything()
      )
    })

    test('returns correct response structure for existing user', async () => {
      const server = await createTestServer()

      mockSendQuery.mockResolvedValueOnce({
        records: [{ Id: '005XYZ987654321' }],
        totalSize: 1,
        done: true
      })

      const res = await findUser(server, 'another.user@example.com')

      const body = assertSuccessResponse(res, 1)
      assertUserData(body.data[0])
      expect(body.data[0].id).toBe('005XYZ987654321')
    })

    test('returns empty data array when user does not exist', async () => {
      const server = await createTestServer()

      mockSendQuery.mockResolvedValueOnce({
        records: [],
        totalSize: 0,
        done: true
      })

      const res = await findUser(server, 'nonexistent.user@example.com')

      assertSuccessResponse(res, 0)
      expect(mockSendQuery).toHaveBeenCalledTimes(1)
    })
  })

  describe('Email validation', () => {
    test('returns 400 for invalid email format', async () => {
      const server = await createTestServer()

      const res = await findUser(server, '12321adsa')

      expect(res.statusCode).toBe(400)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body).toMatchObject({
        message: 'Your request could not be processed',
        code: 'BAD_REQUEST',
        errors: [
          {
            code: 'VALIDATION_ERROR',
            message: 'emailAddress provided is not in a valid format'
          }
        ]
      })

      expect(mockSendQuery).not.toHaveBeenCalled()
    })

    test('returns 400 for missing emailAddress field', async () => {
      const server = await createTestServer()

      const res = await server.inject({
        method: ENDPOINT_METHOD,
        url: ENDPOINT_PATH,
        payload: {}
      })

      expect(res.statusCode).toBe(400)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body.code).toBe('BAD_REQUEST')
      expect(body.errors).toBeDefined()
      expect(body.errors.length).toBeGreaterThan(0)
      expect(mockSendQuery).not.toHaveBeenCalled()
    })
  })

  describe('Salesforce error handling', () => {
    test('returns 500 when Salesforce query fails', async () => {
      const server = await createTestServer()

      // Mock Salesforce error - will be retried 4 times (initial + 3 retries)
      mockSendQuery
        .mockRejectedValueOnce(new Error('Salesforce connection failed'))
        .mockRejectedValueOnce(new Error('Salesforce connection failed'))
        .mockRejectedValueOnce(new Error('Salesforce connection failed'))
        .mockRejectedValueOnce(new Error('Salesforce connection failed'))

      const res = await findUser(server, 'test.user@example.com')

      expect(res.statusCode).toBe(500)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body).toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        errors: [
          {
            code: 'DATABASE_ERROR',
            message:
              'Cannot perform query successfully on the case management service'
          }
        ]
      })

      // Verify retry logic - should be called 4 times (initial + 3 retries)
      expect(mockSendQuery).toHaveBeenCalledTimes(4)
      // Token is fetched once before retry, not on each attempt
      expect(mockGetAccessToken).toHaveBeenCalledTimes(1)
    })

    test('escapes single quotes to prevent SOQL injection', async () => {
      const server = await createTestServer()

      mockSendQuery.mockResolvedValueOnce({
        records: [],
        totalSize: 0,
        done: true
      })

      const maliciousEmail = "test'user@example.com"
      const res = await findUser(server, maliciousEmail)

      expect(res.statusCode).toBe(200)
      expect(mockSendQuery).toHaveBeenCalledWith(
        expect.stringContaining("\\'"),
        MOCK_SALESFORCE_TOKEN,
        expect.anything()
      )

      const calledQuery = mockSendQuery.mock.calls[0][0]
      expect(calledQuery).toContain("test\\'user@example.com")
    })
  })
})

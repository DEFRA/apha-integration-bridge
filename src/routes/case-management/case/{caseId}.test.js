import Hapi from '@hapi/hapi'
import { test, expect, describe, jest, beforeEach } from '@jest/globals'
import hapiPino from 'hapi-pino'
import * as route from './{caseId}.js'
import { salesforceClient } from '../../../lib/salesforce/client.js'
import * as userContext from '../../../common/helpers/user-context.js'

const ENDPOINT_PATH_TEMPLATE = '/case-management/case/{caseId}'
const ENDPOINT_METHOD = 'GET'
const TEST_CASE_ID = '500ABC123456789'
const TEST_USER_EMAIL = 'test.user@example.com'

const mockSendQuery = jest.spyOn(salesforceClient, 'sendQuery')
const mockGetUserAccessToken = jest.spyOn(
  salesforceClient,
  'getUserAccessToken'
)
const mockGetUserEmail = jest.spyOn(userContext, 'getUserEmail')

const MOCK_SALESFORCE_TOKEN = 'mock-salesforce-access-token-12345'

beforeEach(() => {
  jest.clearAllMocks()
  mockGetUserEmail.mockReturnValue(null) // Default: no user context
  mockGetUserAccessToken.mockResolvedValue(MOCK_SALESFORCE_TOKEN)
})

const mockCaseRecord = {
  Id: TEST_CASE_ID,
  CaseNumber: '00001234',
  Status: 'Preparing',
  Priority: 'Medium',
  ContactId: '003XYZ987654321',
  CreatedDate: '2026-02-09T10:30:00.000Z',
  LastModifiedDate: '2026-02-09T11:45:00.000Z'
}

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

  server.auth.scheme('simple', () => {
    return {
      authenticate: (request, h) => h.authenticated({ credentials: {} })
    }
  })

  server.auth.strategy('simple', 'simple', {})
  server.auth.default('simple')

  server.route({
    handler: route.default.handler,
    options: route.default.options,
    path: ENDPOINT_PATH_TEMPLATE,
    method: ENDPOINT_METHOD
  })

  return server
}

/**
 * @param {Hapi.Server} server
 * @param {string} caseId
 * @param {Record<string, string>} [headers]
 */
async function getCase(server, caseId, headers = {}) {
  return server.inject({
    method: ENDPOINT_METHOD,
    url: `/case-management/case/${caseId}`,
    headers: {
      authorization: 'Bearer test-m2m-token',
      ...headers
    }
  })
}

describe('GET /case-management/case/{caseId}', () => {
  describe('Successful case retrieval', () => {
    test('returns case details when case exists with user context', async () => {
      const server = await createTestServer()

      // Mock user email extraction
      mockGetUserEmail.mockReturnValue(TEST_USER_EMAIL)

      mockSendQuery.mockResolvedValueOnce({
        records: [mockCaseRecord],
        totalSize: 1,
        done: true
      })

      const res = await getCase(server, TEST_CASE_ID, {
        'x-forwarded-authorization': 'Bearer test-user-jwt-token'
      })

      expect(res.statusCode).toBe(200)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body.data).toHaveProperty('type', 'case')
      expect(body.data).toHaveProperty('id', TEST_CASE_ID)
      expect(body.data.attributes).toMatchObject({
        caseNumber: '00001234',
        status: 'Preparing',
        priority: 'Medium',
        contactId: '003XYZ987654321'
      })
      expect(body).toHaveProperty('links')
      expect(body.links).toHaveProperty('self')

      // Verify user access token was requested
      expect(mockGetUserAccessToken).toHaveBeenCalledTimes(1)
      expect(mockGetUserAccessToken).toHaveBeenCalledWith(
        TEST_USER_EMAIL,
        expect.anything()
      )

      // Verify sendQuery was called with the Salesforce token (not userEmail)
      expect(mockSendQuery).toHaveBeenCalledTimes(1)
      expect(mockSendQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        MOCK_SALESFORCE_TOKEN, // Token is now 2nd parameter
        expect.anything()
      )
      expect(mockSendQuery).toHaveBeenCalledWith(
        expect.stringContaining(TEST_CASE_ID),
        MOCK_SALESFORCE_TOKEN,
        expect.anything()
      )
    })

    test('returns 400 when X-Forwarded-Authorization is missing', async () => {
      const server = await createTestServer()

      // getUserEmail returns null when header is missing
      mockGetUserEmail.mockReturnValue(null)

      const res = await getCase(server, TEST_CASE_ID)

      expect(res.statusCode).toBe(400)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body).toMatchObject({
        message: 'User authentication required',
        code: 'BAD_REQUEST',
        errors: [
          {
            code: 'MISSING_QUERY_PARAMETER',
            message:
              'X-Forwarded-Authorization header with valid email claim is required'
          }
        ]
      })

      // Verify no Salesforce calls were made
      expect(mockGetUserAccessToken).not.toHaveBeenCalled()
      expect(mockSendQuery).not.toHaveBeenCalled()
    })

    test('includes all case fields in response', async () => {
      const server = await createTestServer()

      mockGetUserEmail.mockReturnValue(TEST_USER_EMAIL)

      mockSendQuery.mockResolvedValueOnce({
        records: [mockCaseRecord],
        totalSize: 1,
        done: true
      })

      const res = await getCase(server, TEST_CASE_ID, {
        'x-forwarded-authorization': 'Bearer test-user-jwt-token'
      })

      expect(res.statusCode).toBe(200)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body.data.attributes).toHaveProperty('caseNumber')
      expect(body.data.attributes).toHaveProperty('status')
      expect(body.data.attributes).toHaveProperty('priority')
      expect(body.data.attributes).toHaveProperty('contactId')
      expect(body.data.attributes).toHaveProperty('createdDate')
      expect(body.data.attributes).toHaveProperty('lastModifiedDate')
    })
  })

  describe('Case not found', () => {
    test('returns 404 when case does not exist', async () => {
      const server = await createTestServer()

      mockGetUserEmail.mockReturnValue(TEST_USER_EMAIL)

      mockSendQuery.mockResolvedValueOnce({
        records: [],
        totalSize: 0,
        done: true
      })

      const res = await getCase(server, 'NONEXISTENT123', {
        'x-forwarded-authorization': 'Bearer test-user-jwt-token'
      })

      expect(res.statusCode).toBe(404)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body).toMatchObject({
        message: 'Case not found',
        code: 'NOT_FOUND',
        errors: [
          {
            code: 'CASE_NOT_FOUND',
            message: 'Case with ID NONEXISTENT123 was not found'
          }
        ]
      })

      expect(mockGetUserAccessToken).toHaveBeenCalledTimes(1)
      expect(mockSendQuery).toHaveBeenCalledTimes(1)
    })
  })

  describe('SOQL injection prevention', () => {
    test('escapes single quotes in case ID to prevent SOQL injection', async () => {
      const server = await createTestServer()

      mockGetUserEmail.mockReturnValue(TEST_USER_EMAIL)

      mockSendQuery.mockResolvedValueOnce({
        records: [],
        totalSize: 0,
        done: true
      })

      const maliciousCaseId = "500ABC' OR '1'='1"
      const res = await getCase(server, maliciousCaseId, {
        'x-forwarded-authorization': 'Bearer test-user-jwt-token'
      })

      expect(res.statusCode).toBe(404) // Not found since it's escaped

      expect(mockSendQuery).toHaveBeenCalledWith(
        expect.stringContaining("\\'"),
        MOCK_SALESFORCE_TOKEN,
        expect.anything()
      )

      const calledQuery = mockSendQuery.mock.calls[0][0]
      expect(calledQuery).toContain("500ABC\\' OR \\'1\\'=\\'1")
    })
  })

  describe('Salesforce error handling', () => {
    test('returns 500 when Salesforce query fails', async () => {
      const server = await createTestServer()

      mockGetUserEmail.mockReturnValue(TEST_USER_EMAIL)

      // Mock Salesforce error - will be retried 4 times (initial + 3 retries)
      mockSendQuery
        .mockRejectedValueOnce(new Error('Salesforce connection failed'))
        .mockRejectedValueOnce(new Error('Salesforce connection failed'))
        .mockRejectedValueOnce(new Error('Salesforce connection failed'))
        .mockRejectedValueOnce(new Error('Salesforce connection failed'))

      const res = await getCase(server, TEST_CASE_ID, {
        'x-forwarded-authorization': 'Bearer test-user-jwt-token'
      })

      expect(res.statusCode).toBe(500)

      const body = /** @type {Record<string, any>} */ (res.result)

      expect(body).toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        errors: [
          {
            code: 'DATABASE_ERROR',
            message: 'Cannot retrieve case from the case management service'
          }
        ]
      })

      // Verify retry logic - should be called 4 times (initial + 3 retries)
      expect(mockSendQuery).toHaveBeenCalledTimes(4)
      // Token is fetched once before retry, not on each attempt
      expect(mockGetUserAccessToken).toHaveBeenCalledTimes(1)
    })

    test('succeeds on retry after initial failure', async () => {
      const server = await createTestServer()

      mockGetUserEmail.mockReturnValue(TEST_USER_EMAIL)

      // First call fails, second succeeds
      mockSendQuery
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          records: [mockCaseRecord],
          totalSize: 1,
          done: true
        })

      const res = await getCase(server, TEST_CASE_ID, {
        'x-forwarded-authorization': 'Bearer test-user-jwt-token'
      })

      expect(res.statusCode).toBe(200)
      expect(mockSendQuery).toHaveBeenCalledTimes(2)
      // Token is fetched once before retry, not on each attempt
      expect(mockGetUserAccessToken).toHaveBeenCalledTimes(1)
    })
  })

  describe('User authentication requirements', () => {
    test('requires X-Forwarded-Authorization header', async () => {
      const server = await createTestServer()

      // Mock missing user context
      mockGetUserEmail.mockReturnValue(null)

      const res = await getCase(server, TEST_CASE_ID)

      expect(res.statusCode).toBe(400)
      expect(mockGetUserEmail).toHaveBeenCalled()
      expect(mockGetUserAccessToken).not.toHaveBeenCalled()
      expect(mockSendQuery).not.toHaveBeenCalled()
    })

    test('extracts email from X-Forwarded-Authorization and creates Salesforce token', async () => {
      const server = await createTestServer()

      mockGetUserEmail.mockReturnValue(TEST_USER_EMAIL)

      mockSendQuery.mockResolvedValueOnce({
        records: [mockCaseRecord],
        totalSize: 1,
        done: true
      })

      const res = await getCase(server, TEST_CASE_ID, {
        'x-forwarded-authorization': 'Bearer test-azure-ad-jwt'
      })

      expect(res.statusCode).toBe(200)

      // Verify email was extracted
      expect(mockGetUserEmail).toHaveBeenCalled()

      // Verify Salesforce token was created for the user
      expect(mockGetUserAccessToken).toHaveBeenCalledWith(
        TEST_USER_EMAIL,
        expect.anything()
      )

      // Verify query was called with the Salesforce token (not email)
      expect(mockSendQuery).toHaveBeenCalledWith(
        expect.anything(),
        MOCK_SALESFORCE_TOKEN,
        expect.anything()
      )
    })
  })
})

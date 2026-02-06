import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test
} from '@jest/globals'

import { salesforceClient } from './client.js'
import { spyOnConfig } from '../../common/helpers/test-helpers/config.js'

const mockLogger = /** @type {any} */ ({
  error: jest.fn()
})

const mockFetch = jest.fn(() => Promise.resolve(/** @type {Response} */ ({})))

const mockedAccessTokenResponse = {
  access_token: 'token-123',
  instance_url: 'https://salesforce.test',
  expires_in: 3600
}

const mockApplicationReference = 'TB-1234-5678'

describe('salesforce client', () => {
  const baseCfg = {
    baseUrl: 'https://salesforce.test',
    authUrl: undefined,
    clientId: 'client-id',
    clientSecret: 'client-secret',
    apiVersion: 'v62.0',
    requestTimeoutMs: 1000
  }

  const mockJsonResponse = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: jest.fn(() => Promise.resolve(body)),
    text: jest.fn()
  })

  beforeEach(() => {
    spyOnConfig('salesforce', baseCfg)
    salesforceClient.cachedToken = null
    salesforceClient.cachedInstanceUrl = null
    salesforceClient.expiresAt = 0
    salesforceClient.refreshPromise = null
    globalThis.fetch = mockFetch
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('caches access tokens until near expiry', async () => {
    mockFetch.mockResolvedValueOnce(
      /** @type {any}*/ (mockJsonResponse(200, mockedAccessTokenResponse))
    )

    const first = await salesforceClient.getAccessToken()
    const second = await salesforceClient.getAccessToken()

    expect(first).toBe('token-123')
    expect(second).toBe('token-123')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  test('only refreshes token once when multiple callers request concurrently', async () => {
    let resolveFetch = () => {}
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = () =>
            resolve(
              /** @type {any}*/ (
                mockJsonResponse(200, {
                  access_token: 'token-concurrent',
                  instance_url: 'https://salesforce.test',
                  expires_in: 3600
                })
              )
            )
        })
    )

    const promiseA = salesforceClient.getAccessToken()
    const promiseB = salesforceClient.getAccessToken()

    expect(mockFetch).toHaveBeenCalledTimes(1)

    resolveFetch()
    const [a, b] = await Promise.all([promiseA, promiseB])

    expect(a).toBe('token-concurrent')
    expect(b).toBe('token-concurrent')
  })

  test('sendComposite returns response body on success', async () => {
    mockFetch
      .mockResolvedValueOnce(
        /** @type {any}*/ (mockJsonResponse(200, mockedAccessTokenResponse))
      )
      .mockResolvedValueOnce(
        /** @type {any}*/ (
          mockJsonResponse(200, {
            compositeResponse: [
              {
                body: { id: '001', success: true },
                httpStatusCode: 201,
                referenceId: 'ref1'
              },
              {
                body: { id: '002', success: true },
                httpStatusCode: 201,
                referenceId: 'ref2'
              }
            ]
          })
        )
      )

    const result = await salesforceClient.sendComposite(
      {
        compositeRequest: [
          {
            method: 'POST',
            url: '/services/data/v62.0/sobjects/Account',
            referenceId: 'ref1',
            body: { Name: 'Test Account 1' }
          },
          {
            method: 'POST',
            url: '/services/data/v62.0/sobjects/Account',
            referenceId: 'ref2',
            body: { Name: 'Test Account 2' }
          }
        ]
      },
      mockLogger
    )

    expect(result).toEqual({
      compositeResponse: [
        {
          body: { id: '001', success: true },
          httpStatusCode: 201,
          referenceId: 'ref1'
        },
        {
          body: { id: '002', success: true },
          httpStatusCode: 201,
          referenceId: 'ref2'
        }
      ]
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/composite'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json'
        },
        body: expect.any(String)
      })
    )
  })

  test('sendComposite throws with sanitised logging when Salesforce returns error', async () => {
    const errorMessage = 'server error'
    mockFetch
      .mockResolvedValueOnce(
        /** @type {any}*/ (mockJsonResponse(200, mockedAccessTokenResponse))
      )
      .mockResolvedValueOnce(
        /** @type {any}*/ (
          mockJsonResponse(500, { message: errorMessage, secret: 'hide' })
        )
      )

    await expect(
      salesforceClient.sendComposite({ compositeRequest: [] }, mockLogger)
    ).rejects.toThrow(/Salesforce POST request failed/)

    expect(mockLogger.error).toHaveBeenCalledWith(
      { status: 500, body: errorMessage },
      'Salesforce POST request failed'
    )
  })

  test('createCustomer returns response body on success', async () => {
    const mockedResponse = {
      id: '001',
      success: true,
      errors: []
    }
    mockFetch
      .mockResolvedValueOnce(
        /** @type {any}*/ (mockJsonResponse(200, mockedAccessTokenResponse))
      )
      .mockResolvedValueOnce(
        /** @type {any}*/ (mockJsonResponse(201, mockedResponse))
      )

    const result = await salesforceClient.createCustomer(
      {
        FirstName: 'Name',
        LastName: 'Surname',
        Email: 'test@mail.com'
      },
      mockLogger
    )

    expect(result).toEqual(mockedResponse)
  })

  test('createCustomer throws with sanitised logging when Salesforce returns error', async () => {
    const errorMessage = 'Unexpected character...'
    mockFetch
      .mockResolvedValueOnce(
        /** @type {any}*/ (mockJsonResponse(200, mockedAccessTokenResponse))
      )
      .mockResolvedValueOnce(
        /** @type {any}*/ (
          mockJsonResponse(400, {
            message: errorMessage,
            errorCode: 'JSON_PARSER_ERROR'
          })
        )
      )

    await expect(
      salesforceClient.createCustomer({}, mockLogger)
    ).rejects.toThrow(/Salesforce POST request failed/)

    expect(mockLogger.error).toHaveBeenCalledWith(
      { status: 400, body: errorMessage },
      'Salesforce POST request failed'
    )
  })

  test('createCase returns response body on success', async () => {
    const mockedResponse = {
      id: 'CASE-001',
      success: true,
      errors: []
    }
    mockFetch
      .mockResolvedValueOnce(
        /** @type {any}*/ (mockJsonResponse(200, mockedAccessTokenResponse))
      )
      .mockResolvedValueOnce(
        /** @type {any}*/ (mockJsonResponse(200, mockedResponse))
      )

    const payload = {
      Status: 'Preparing',
      Priority: 'Medium',
      APHA_Application__c: 'APP-123',
      ContactId: 'CONTACT-456'
    }

    const result = await salesforceClient.createCase(
      payload,
      mockApplicationReference,
      mockLogger
    )

    expect(result).toEqual(mockedResponse)
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining(
        `/sobjects/Case/APHA_ExternalReferenceNumber__c/${mockApplicationReference}`
      ),
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
    )
  })

  test('createCase throws with sanitised logging when Salesforce returns error', async () => {
    const errorMessage = 'Unexpected character...'
    mockFetch
      .mockResolvedValueOnce(
        /** @type {any}*/ (mockJsonResponse(200, mockedAccessTokenResponse))
      )
      .mockResolvedValueOnce(
        /** @type {any}*/ (
          mockJsonResponse(400, {
            message: errorMessage,
            errorCode: 'JSON_PARSER_ERROR'
          })
        )
      )

    await expect(
      salesforceClient.createCase({}, mockApplicationReference, mockLogger)
    ).rejects.toThrow(/Salesforce PATCH request failed/)

    expect(mockLogger.error).toHaveBeenCalledWith(
      { status: 400, body: errorMessage },
      'Salesforce PATCH request failed'
    )
  })

  test('sendQuery returns response body on success', async () => {
    mockFetch
      .mockResolvedValueOnce(
        /** @type {any}*/ (mockJsonResponse(200, mockedAccessTokenResponse))
      )
      .mockResolvedValueOnce(
        /** @type {any}*/ (
          mockJsonResponse(200, {
            totalSize: 2,
            done: true,
            records: [
              { Id: '001', Name: 'Test Record 1' },
              { Id: '002', Name: 'Test Record 2' }
            ]
          })
        )
      )

    const result = await salesforceClient.sendQuery(
      'SELECT Id, Name FROM Account',
      mockLogger
    )

    expect(result).toEqual({
      totalSize: 2,
      done: true,
      records: [
        { Id: '001', Name: 'Test Record 1' },
        { Id: '002', Name: 'Test Record 2' }
      ]
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining(
        '/query?q=' + encodeURIComponent('SELECT Id, Name FROM Account')
      ),
      expect.objectContaining({
        method: 'GET',
        headers: {
          Authorization: 'Bearer token-123'
        }
      })
    )
  })

  test('sendQuery throws with sanitised logging when Salesforce returns error', async () => {
    mockFetch
      .mockResolvedValueOnce(
        /** @type {any}*/ (mockJsonResponse(200, mockedAccessTokenResponse))
      )
      .mockResolvedValueOnce(
        /** @type {any}*/ (
          mockJsonResponse(400, {
            message: 'Invalid SOQL query',
            errorCode: 'MALFORMED_QUERY'
          })
        )
      )

    await expect(
      salesforceClient.sendQuery('SELECT * FORM Account', mockLogger)
    ).rejects.toThrow(/Salesforce query request failed/)

    expect(mockLogger.error).toHaveBeenCalledWith(
      { status: 400, body: expect.any(String) },
      'Salesforce query request failed'
    )
  })

  test('throws a timeout error when fetch aborts', async () => {
    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'
    mockFetch.mockRejectedValueOnce(abortError)

    await expect(salesforceClient.getAccessToken()).rejects.toThrow(
      'Salesforce token request timed out'
    )
  })

  test('throws when client credentials are missing', async () => {
    spyOnConfig('salesforce', {
      ...baseCfg,
      clientId: null,
      clientSecret: null
    })

    await expect(salesforceClient.getAccessToken()).rejects.toThrow(
      'Salesforce client credentials are not configured'
    )
  })
})

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test
} from '@jest/globals'

import { salesforceClient } from './client.js'

describe('salesforce client', () => {
  let cfgSpy

  const baseCfg = {
    enabled: true,
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
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn()
  })

  beforeEach(() => {
    cfgSpy = jest.spyOn(salesforceClient, 'cfg', 'get').mockReturnValue(baseCfg)
    salesforceClient.cachedToken = null
    salesforceClient.cachedInstanceUrl = null
    salesforceClient.expiresAt = 0
    salesforceClient.refreshPromise = null
    global.fetch = jest.fn()
  })

  afterEach(() => {
    cfgSpy?.mockRestore()
    jest.clearAllMocks()
  })

  test('caches access tokens until near expiry', async () => {
    global.fetch.mockResolvedValueOnce(
      mockJsonResponse(200, {
        access_token: 'token-123',
        instance_url: 'https://salesforce.test',
        expires_in: 3600
      })
    )

    const first = await salesforceClient.getAccessToken()
    const second = await salesforceClient.getAccessToken()

    expect(first).toBe('token-123')
    expect(second).toBe('token-123')
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  test('only refreshes token once when multiple callers request concurrently', async () => {
    let resolveFetch
    global.fetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = () =>
            resolve(
              mockJsonResponse(200, {
                access_token: 'token-concurrent',
                instance_url: 'https://salesforce.test',
                expires_in: 3600
              })
            )
        })
    )

    const promiseA = salesforceClient.getAccessToken()
    const promiseB = salesforceClient.getAccessToken()

    expect(global.fetch).toHaveBeenCalledTimes(1)

    resolveFetch()
    const [a, b] = await Promise.all([promiseA, promiseB])

    expect(a).toBe('token-concurrent')
    expect(b).toBe('token-concurrent')
  })

  test('sendComposite throws with sanitised logging when Salesforce returns error', async () => {
    global.fetch
      .mockResolvedValueOnce(
        mockJsonResponse(200, {
          access_token: 'token-123',
          instance_url: 'https://salesforce.test',
          expires_in: 3600
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse(500, { message: 'server error', secret: 'hide' })
      )

    const logger = { error: jest.fn() }

    await expect(
      salesforceClient.sendComposite({ compositeRequest: [] }, logger)
    ).rejects.toThrow(/Salesforce composite request failed/)

    expect(logger.error).toHaveBeenCalledWith(
      { status: 500, body: expect.any(String) },
      'Salesforce composite request failed'
    )
  })

  test('throws a timeout error when fetch aborts', async () => {
    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'
    global.fetch.mockRejectedValueOnce(abortError)

    await expect(salesforceClient.getAccessToken()).rejects.toThrow(
      'Salesforce token request timed out'
    )
  })

  test('throws when client credentials are missing', async () => {
    cfgSpy.mockReturnValue({
      ...baseCfg,
      clientId: null,
      clientSecret: null
    })

    await expect(salesforceClient.getAccessToken()).rejects.toThrow(
      'Salesforce client credentials are not configured'
    )
  })
})

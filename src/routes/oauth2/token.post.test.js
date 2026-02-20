import {
  jest,
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  test,
  expect
} from '@jest/globals'
import Hapi from '@hapi/hapi'
import { spyOnConfig } from '../../common/helpers/test-helpers/config.js'

/**
 * @typedef {import('@hapi/hapi').Server} Server
 * @typedef {import('@hapi/hapi').ServerInjectResponse} ServerInjectResponse
 * @typedef {{message: string}} ErrorResult
 * @typedef {jest.Mock<typeof fetch>} MockFetch
 */

describe('POST /oauth2/token', () => {
  /** @type {Server} */
  let server
  /** @type {jest.Mock<typeof fetch>} */
  const mockFetch = jest.fn(() => Promise.resolve(/** @type {Response} */ ({})))

  /**
   * Helper to create a mock Response object
   * @param {boolean} ok
   * @param {number} status
   * @param {any} data
   * @returns {Partial<Response>}
   */
  const createMockResponse = (ok, status, data) => ({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: new Headers(),
    json: async () => data,
    text: async () => (typeof data === 'string' ? data : JSON.stringify(data))
  })

  /**
   * Helper to create a mock token request payload
   * @param {Partial<{grant_type: string, client_id: string, client_secret: string}>} [overrides]
   * @returns {string}
   */
  const createPayload = (overrides = {}) => {
    const params = {
      grant_type: 'client_credentials',
      client_id: 'test-client-id',
      client_secret: 'test-client-secret',
      ...overrides
    }
    return new URLSearchParams(params).toString()
  }

  /**
   * Helper to inject a token request
   * @param {Partial<{grant_type: string, client_id: string, client_secret: string}>} [payload]
   * @returns {Promise<ServerInjectResponse>}
   */
  const injectTokenRequest = (payload = {}) => {
    return server.inject({
      method: 'POST',
      url: '/oauth2/token',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      payload: createPayload(payload)
    })
  }

  beforeAll(async () => {
    server = Hapi.server({ port: 0 })

    const mockLogger = {
      trace: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn()
    }

    server.decorate('server', 'logger', mockLogger)
    server.decorate('request', 'logger', mockLogger)

    const { default: tokenRoute } = await import('./token.post.js')
    if (tokenRoute) {
      // Route path is derived from filename by routing plugin
      // @ts-expect-error - Route uses routing plugin convention (path auto-derived from filename)
      server.route({ ...tokenRoute, path: '/oauth2/token' })
    }
  })

  beforeEach(() => {
    spyOnConfig('cognito', {
      tokenUrl: 'https://cognito.test/oauth2/token'
    })
    spyOnConfig('featureFlags', {
      isTokenEndpointEnabled: true
    })
    globalThis.fetch = mockFetch
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('returns access token on successful Cognito response', async () => {
    const mockTokenResponse = {
      access_token: 'mock-token-123',
      token_type: 'Bearer',
      expires_in: 3600
    }

    mockFetch.mockResolvedValueOnce(
      /** @type {any} */ (createMockResponse(true, 200, mockTokenResponse))
    )

    const res = await injectTokenRequest()

    expect(res.statusCode).toBe(200)
    expect(res.result).toEqual(mockTokenResponse)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded'
        })
      })
    )
  })

  test('returns error when Cognito returns error', async () => {
    mockFetch.mockResolvedValueOnce(
      /** @type {any} */ (
        createMockResponse(false, 401, 'Invalid client credentials')
      )
    )

    const res = await injectTokenRequest({
      client_id: 'invalid-client-id',
      client_secret: 'invalid-secret'
    })

    // Error handling may return either 400 or 500 depending on error type
    expect([400, 500]).toContain(res.statusCode)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  test('returns 500 error when network error occurs', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const res = await injectTokenRequest()

    expect(res.statusCode).toBe(500)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  test('validates required fields - missing client_id and client_secret', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/oauth2/token',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      payload: 'grant_type=client_credentials'
    })

    expect(res.statusCode).toBe(400)
    const result = /** @type {ErrorResult} */ (res.result)
    expect(result.message).toBeDefined()
  })

  test('rejects invalid grant_type', async () => {
    const res = await injectTokenRequest({ grant_type: 'password' })

    expect(res.statusCode).toBe(400)
    const result = /** @type {ErrorResult} */ (res.result)
    expect(result.message).toBeDefined()
  })
})

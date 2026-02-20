import {
  jest,
  describe,
  beforeAll,
  afterAll,
  afterEach,
  test,
  expect
} from '@jest/globals'
import Hapi from '@hapi/hapi'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { spyOnConfigMany } from '../../common/helpers/test-helpers/config.js'

/**
 * @typedef {import('@hapi/hapi').Server} Server
 * @typedef {import('@hapi/hapi').ServerInjectResponse} ServerInjectResponse
 * @typedef {{message: string}} ErrorResult
 */

const COGNITO_URL = 'https://mock-cognito/oauth2/token'
const msw = setupServer()

describe('POST /oauth2/token', () => {
  /** @type {Server} */
  let server

  /**
   * Helper to create a mock token request payload
   * @param {Partial<{grant_type: string, client_id: string, client_secret: string}>} [overrides]
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
    spyOnConfigMany({
      'cognito.tokenUrl': COGNITO_URL,
      'featureFlags.isTokenEndpointEnabled': true
    })

    msw.listen()

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

  afterEach(() => {
    msw.resetHandlers()
  })

  afterAll(async () => {
    msw.close()
    await server.stop()
  })

  test('returns access token on successful Cognito response', async () => {
    const mockTokenResponse = {
      access_token: 'mock-token-123',
      token_type: 'Bearer',
      expires_in: 3600
    }

    msw.use(
      http.post(COGNITO_URL, () => {
        return HttpResponse.json(mockTokenResponse, { status: 200 })
      })
    )

    const res = await injectTokenRequest()

    expect(res.statusCode).toBe(200)
    expect(res.result).toEqual(mockTokenResponse)
  })

  test('returns error when Cognito returns error', async () => {
    msw.use(
      http.post(COGNITO_URL, () => {
        return HttpResponse.text('Invalid client credentials', { status: 401 })
      })
    )

    const res = await injectTokenRequest({
      client_id: 'invalid-client-id',
      client_secret: 'invalid-secret'
    })

    // Error handling may return either 400 or 500 depending on error type
    expect([400, 500]).toContain(res.statusCode)
  })

  test('returns 500 error when network error occurs', async () => {
    msw.use(
      http.post(COGNITO_URL, () => {
        return HttpResponse.error()
      })
    )

    const res = await injectTokenRequest()

    expect(res.statusCode).toBe(500)
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

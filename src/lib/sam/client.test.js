import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test
} from '@jest/globals'

import { SamClient, SamApiError } from './client.js'
import { samClient } from './index.js'
import { spyOnConfig } from '../../common/helpers/test-helpers/config.js'

const SENTINEL_EMAIL = 'sentinel.person@apha.gov.uk'
const SECRET = 'entra-secret-sentinel'
const TOKEN = 'access-token-sentinel'

const baseCfg = {
  baseUrl: 'https://sam.test/api/sam/v1',
  writePath: '/standardwork',
  requestTimeoutMs: 1000,
  entra: {
    tokenUrl: 'https://login.test/tenant/oauth2/v2.0/token',
    clientId: 'entra-client-id',
    clientSecret: SECRET,
    scope: 'api://sam-app/.default'
  }
}

const validPayload = {
  workscheduleid: 'WS-12345',
  workscheduleactivityid: 'WSA-100023',
  activityclosingreason: 'Resolved-Not-Required',
  businessresource: SENTINEL_EMAIL
}

const mockLogger = /** @type {any} */ ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
})

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body)
})

const textResponse = (status, text) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => text
})

const tokenResponse = (accessToken = TOKEN, expiresIn = 3600) =>
  jsonResponse(200, {
    token_type: 'Bearer',
    expires_in: expiresIn,
    access_token: accessToken
  })

const successBody = {
  code: 'sam-api-success',
  uid: '08d94217-8a85-4962-921b-6c42241b9d3d',
  message: 'Work schedule activity WSA-12345 updated'
}

const mockFetch = jest.fn()
const originalFetch = globalThis.fetch

// routes the fetch mock by URL — token endpoint vs write; queues shift,
// last entry repeats
const routeFetch = ({ token = [tokenResponse()], write = [] }) => {
  const queues = { token: [...token], write: [...write] }

  mockFetch.mockImplementation((url) => {
    const queue = String(url).startsWith(baseCfg.entra.tokenUrl)
      ? queues.token
      : queues.write
    const next = queue.length > 1 ? queue.shift() : queue[0]

    if (next instanceof Error) {
      return Promise.reject(next)
    }

    return Promise.resolve(next)
  })
}

const tokenCalls = () =>
  mockFetch.mock.calls.filter(([url]) =>
    String(url).startsWith(baseCfg.entra.tokenUrl)
  )

const writeCalls = () =>
  mockFetch.mock.calls.filter(
    ([url]) => !String(url).startsWith(baseCfg.entra.tokenUrl)
  )

/** everything the client logged, flattened for sentinel checks */
const allLoggedText = () =>
  JSON.stringify([
    mockLogger.debug.mock.calls,
    mockLogger.warn.mock.calls,
    mockLogger.error.mock.calls
  ])

describe('sam client', () => {
  /** @type {SamClient} */
  let client

  beforeEach(() => {
    client = new SamClient()
    spyOnConfig('samApi', structuredClone(baseCfg))
    globalThis.fetch = /** @type {any} */ (mockFetch)
    mockFetch.mockReset()
    mockLogger.debug.mockReset()
    mockLogger.warn.mockReset()
    mockLogger.error.mockReset()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    jest.restoreAllMocks()
  })

  describe('getAccessToken', () => {
    test('POSTs the client-credentials grant with the expected shape', async () => {
      routeFetch({})

      const token = await client.getAccessToken(mockLogger)

      expect(token).toBe(TOKEN)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const [url, options] = mockFetch.mock.calls[0]

      expect(url).toBe(baseCfg.entra.tokenUrl)
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBe(
        'application/x-www-form-urlencoded'
      )
      expect(options.redirect).toBe('error')

      const params = new URLSearchParams(options.body)

      expect(params.get('grant_type')).toBe('client_credentials')
      expect(params.get('client_id')).toBe(baseCfg.entra.clientId)
      expect(params.get('client_secret')).toBe(SECRET)
      expect(params.get('scope')).toBe(baseCfg.entra.scope)
    })

    test('caches the token across calls', async () => {
      routeFetch({})

      await client.getAccessToken(mockLogger)
      await client.getAccessToken(mockLogger)

      expect(tokenCalls()).toHaveLength(1)
    })

    test('refreshes when the token is within the expiry buffer', async () => {
      routeFetch({ token: [tokenResponse(TOKEN, 4), tokenResponse('token-2')] })

      await client.getAccessToken(mockLogger)
      const second = await client.getAccessToken(mockLogger)

      expect(second).toBe('token-2')
      expect(tokenCalls()).toHaveLength(2)
    })

    test('applies the 5s buffer once: a 10s token stays cached', async () => {
      // if the buffer were applied at both store AND check time, a 10s
      // token would look expired immediately
      routeFetch({
        token: [tokenResponse(TOKEN, 10), tokenResponse('token-2')]
      })

      await client.getAccessToken(mockLogger)
      const second = await client.getAccessToken(mockLogger)

      expect(second).toBe(TOKEN)
      expect(tokenCalls()).toHaveLength(1)
    })

    test('shares a single in-flight refresh between concurrent callers', async () => {
      routeFetch({})

      const [a, b] = await Promise.all([
        client.getAccessToken(mockLogger),
        client.getAccessToken(mockLogger)
      ])

      expect(a).toBe(TOKEN)
      expect(b).toBe(TOKEN)
      expect(tokenCalls()).toHaveLength(1)
    })

    test('throws SamApiError when the token endpoint returns non-2xx', async () => {
      routeFetch({
        token: [jsonResponse(400, { error: 'invalid_client' })]
      })

      const error = await client.getAccessToken(mockLogger).catch((e) => e)

      expect(error).toBeInstanceOf(SamApiError)
      expect(error.statusCode).toBe(400)
      expect(error.message).not.toContain(SECRET)
    })

    test('throws SamApiError when the token response has no access_token', async () => {
      routeFetch({ token: [jsonResponse(200, { token_type: 'Bearer' })] })

      await expect(client.getAccessToken(mockLogger)).rejects.toBeInstanceOf(
        SamApiError
      )
    })

    const entraKeys = [
      ['tokenUrl', 'SAM_API_ENTRA_TOKEN_URL'],
      ['clientId', 'SAM_API_ENTRA_CLIENT_ID'],
      ['clientSecret', 'SAM_API_ENTRA_CLIENT_SECRET'],
      ['scope', 'SAM_API_ENTRA_SCOPE']
    ]

    const absentValues = [
      ['null', null],
      ['empty', ''],
      ['whitespace-only', '   ']
    ]

    test.each(
      entraKeys.flatMap(([key, envVar]) =>
        absentValues.map(([label, value]) => [key, label, envVar, value])
      )
    )(
      'throws a plain Error naming the env var when %s is %s',
      async (key, _label, envVar, value) => {
        spyOnConfig('samApi', {
          ...structuredClone(baseCfg),
          entra: { ...baseCfg.entra, [key]: value }
        })

        const error = await client.getAccessToken(mockLogger).catch((e) => e)

        expect(error).toBeInstanceOf(Error)
        expect(error).not.toBeInstanceOf(SamApiError)
        expect(error.message).toContain(envVar)

        if (value) {
          // never echo the configured value back
          expect(error.message).not.toContain(value)
        }

        expect(mockFetch).not.toHaveBeenCalled()
      }
    )
  })

  describe('updateStandardActivity pass-through', () => {
    test.each([
      [200, successBody],
      [
        400,
        {
          code: 'sam-api-error-ws-not-found',
          uid: 'uid-1',
          message: 'Work Schedule WS-12345 was not found'
        }
      ],
      [
        403,
        {
          code: 'sam-api-error-ws-closed',
          uid: 'uid-2',
          message: 'Parent work schedule WS-12345 is Resolved.'
        }
      ],
      [
        405,
        {
          code: 'sam-api-error-invalid-class-type',
          uid: 'uid-3',
          message: 'The class type referenced by WSA-99999 cannot be updated'
        }
      ],
      [
        409,
        {
          code: 'sam-api-error-wsa-locked',
          uid: 'uid-4',
          message: 'Work Schedule Activity WSA-99999 is locked'
        }
      ]
    ])('passes through a Sam %i response verbatim', async (status, body) => {
      routeFetch({ write: [jsonResponse(status, body)] })

      const result = await client.updateStandardActivity(
        validPayload,
        mockLogger
      )

      expect(result).toEqual({ statusCode: status, body })
    })

    test('sends the PATCH to baseUrl+writePath with the payload verbatim', async () => {
      spyOnConfig('samApi', {
        ...structuredClone(baseCfg),
        baseUrl: 'https://sam.test/api/sam/v1/'
      })
      routeFetch({ write: [jsonResponse(200, successBody)] })

      await client.updateStandardActivity(validPayload, mockLogger)

      const [url, options] = writeCalls()[0]

      expect(url).toBe('https://sam.test/api/sam/v1/standardwork')
      expect(options.method).toBe('PATCH')
      expect(options.headers['Content-Type']).toBe('application/json')
      expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`)
      expect(options.redirect).toBe('error')
      expect(options.body).toBe(JSON.stringify(validPayload))
    })

    test('throws SamApiError for a 4xx JSON body without a sam-api- code', async () => {
      routeFetch({
        write: [jsonResponse(404, { message: 'no such route' })]
      })

      const error = await client
        .updateStandardActivity(validPayload, mockLogger)
        .catch((e) => e)

      expect(error).toBeInstanceOf(SamApiError)
      expect(error.statusCode).toBe(404)
    })

    test('throws SamApiError for a 500 response and does not forward the body', async () => {
      routeFetch({
        write: [jsonResponse(500, { stack: 'secret internals' })]
      })

      const error = await client
        .updateStandardActivity(validPayload, mockLogger)
        .catch((e) => e)

      expect(error).toBeInstanceOf(SamApiError)
      expect(error.statusCode).toBe(500)
      expect(error.message).not.toContain('secret internals')
    })

    test('throws SamApiError for a non-JSON body', async () => {
      routeFetch({ write: [textResponse(200, '<html>gateway</html>')] })

      await expect(
        client.updateStandardActivity(validPayload, mockLogger)
      ).rejects.toBeInstanceOf(SamApiError)
    })

    test('throws SamApiError for an empty 2xx body', async () => {
      routeFetch({ write: [textResponse(204, '')] })

      await expect(
        client.updateStandardActivity(validPayload, mockLogger)
      ).rejects.toBeInstanceOf(SamApiError)
    })

    test('passes through a 2xx JSON primitive body verbatim', async () => {
      routeFetch({ write: [jsonResponse(200, true)] })

      const result = await client.updateStandardActivity(
        validPayload,
        mockLogger
      )

      expect(result).toEqual({ statusCode: 200, body: true })
    })

    test('reports a mid-body transport failure as a transport failure', async () => {
      routeFetch({
        write: [
          {
            ok: true,
            status: 200,
            text: () =>
              Promise.reject(
                Object.assign(new TypeError('terminated'), {
                  cause: { code: 'ECONNRESET' }
                })
              )
          }
        ]
      })

      const error = await client
        .updateStandardActivity(validPayload, mockLogger)
        .catch((e) => e)

      expect(error).toBeInstanceOf(SamApiError)
      expect(error.message).toContain('ECONNRESET')
      // not attributed to the upstream status — no response was received
      expect(error.statusCode).toBeUndefined()
    })

    test('throws SamApiError when fetch rejects (network / refused redirect)', async () => {
      routeFetch({
        write: [
          Object.assign(new TypeError('fetch failed'), {
            cause: { code: 'ERR_TOO_MANY_REDIRECTS' }
          })
        ]
      })

      const error = await client
        .updateStandardActivity(validPayload, mockLogger)
        .catch((e) => e)

      expect(error).toBeInstanceOf(SamApiError)
      expect(error.message).toContain('ERR_TOO_MANY_REDIRECTS')
      expect(writeCalls()).toHaveLength(1)
    })
  })

  describe('401 handling', () => {
    test('evicts, re-authenticates and retries exactly once on a first 401', async () => {
      routeFetch({
        token: [tokenResponse('token-1'), tokenResponse('token-2')],
        write: [jsonResponse(401, {}), jsonResponse(200, successBody)]
      })

      const result = await client.updateStandardActivity(
        validPayload,
        mockLogger
      )

      expect(result).toEqual({ statusCode: 200, body: successBody })
      expect(tokenCalls()).toHaveLength(2)
      expect(writeCalls()).toHaveLength(2)

      const [firstWrite, secondWrite] = writeCalls()

      expect(firstWrite[1].headers.Authorization).toBe('Bearer token-1')
      expect(secondWrite[1].headers.Authorization).toBe('Bearer token-2')
    })

    test('throws SamApiError on a second 401 and evicts that token too', async () => {
      routeFetch({
        token: [
          tokenResponse('token-1'),
          tokenResponse('token-2'),
          tokenResponse('token-3')
        ],
        write: [jsonResponse(401, {})]
      })

      const error = await client
        .updateStandardActivity(validPayload, mockLogger)
        .catch((e) => e)

      expect(error).toBeInstanceOf(SamApiError)
      expect(error.statusCode).toBe(401)
      expect(writeCalls()).toHaveLength(2)

      // second rejected token was evicted too — a later request must
      // re-fetch, not reuse it
      await client.getAccessToken(mockLogger)

      expect(tokenCalls()).toHaveLength(3)
    })

    test('concurrent 401s share one re-fetch and both requests succeed', async () => {
      const t1 = tokenResponse('token-1')
      const t2 = tokenResponse('token-2')

      const queues = { token: [t1, t2], writesByToken: new Map() }

      mockFetch.mockImplementation((url, options) => {
        if (String(url).startsWith(baseCfg.entra.tokenUrl)) {
          const next =
            queues.token.length > 1 ? queues.token.shift() : queues.token[0]

          return Promise.resolve(next)
        }

        // token-1 always 401s; token-2 succeeds
        if (options.headers.Authorization === 'Bearer token-1') {
          return Promise.resolve(jsonResponse(401, {}))
        }

        return Promise.resolve(jsonResponse(200, successBody))
      })

      const [a, b] = await Promise.all([
        client.updateStandardActivity(validPayload, mockLogger),
        client.updateStandardActivity(validPayload, mockLogger)
      ])

      expect(a).toEqual({ statusCode: 200, body: successBody })
      expect(b).toEqual({ statusCode: 200, body: successBody })
      // exactly two: the initial grant plus ONE shared re-fetch (1 would
      // mean the re-fetch got collapsed away, 3 would mean it wasn't
      // shared)
      expect(tokenCalls()).toHaveLength(2)
    })

    test('a delayed stale eviction does not discard a fresh token', async () => {
      routeFetch({})

      await client.getAccessToken(mockLogger)

      client.evictToken('some-older-rejected-token')

      await client.getAccessToken(mockLogger)

      expect(tokenCalls()).toHaveLength(1)
    })
  })

  describe('timeouts', () => {
    const hangUntilAborted = () =>
      mockFetch.mockImplementation(
        (url, options) =>
          new Promise((resolve, reject) => {
            options.signal.addEventListener('abort', () =>
              reject(
                Object.assign(new Error('This operation was aborted'), {
                  name: 'AbortError'
                })
              )
            )
          })
      )

    test('maps a token-request timeout to SamApiError', async () => {
      spyOnConfig('samApi', {
        ...structuredClone(baseCfg),
        requestTimeoutMs: 5
      })
      hangUntilAborted()

      const error = await client.getAccessToken(mockLogger).catch((e) => e)

      expect(error).toBeInstanceOf(SamApiError)
      expect(error.message).toContain('timed out')
    })

    test('maps a write timeout to SamApiError without retrying', async () => {
      spyOnConfig('samApi', {
        ...structuredClone(baseCfg),
        requestTimeoutMs: 5
      })

      mockFetch.mockImplementation((url, options) => {
        if (String(url).startsWith(baseCfg.entra.tokenUrl)) {
          return Promise.resolve(tokenResponse())
        }

        return new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(
              Object.assign(new Error('This operation was aborted'), {
                name: 'AbortError'
              })
            )
          )
        })
      })

      const error = await client
        .updateStandardActivity(validPayload, mockLogger)
        .catch((e) => e)

      expect(error).toBeInstanceOf(SamApiError)
      expect(error.message).toContain('timed out')
      expect(writeCalls()).toHaveLength(1)
    })
  })

  describe('log and error hygiene', () => {
    test('never embeds Sam message/field_errors text, the secret or the token', async () => {
      routeFetch({
        write: [
          jsonResponse(500, {
            code: 'sam-api-error-unexpected-error',
            uid: 'uid-9',
            message: `Resource ${SENTINEL_EMAIL} either not found, or is not valid for use`,
            field_errors: [
              {
                code: 'sam-api-error-invalid-format',
                message: `${SENTINEL_EMAIL} must be a valid email address`
              }
            ]
          })
        ]
      })

      const error = await client
        .updateStandardActivity(validPayload, mockLogger)
        .catch((e) => e)

      expect(error).toBeInstanceOf(SamApiError)
      expect(error.message).not.toContain(SENTINEL_EMAIL)
      expect(error.samCode).toBe('sam-api-error-unexpected-error')
      expect(error.uid).toBe('uid-9')

      const logged = allLoggedText()

      expect(logged).not.toContain(SENTINEL_EMAIL)
      expect(logged).not.toContain(SECRET)
      expect(logged).not.toContain(TOKEN)
    })
  })

  test('exports a singleton for runtime use', () => {
    expect(samClient).toBeInstanceOf(SamClient)
  })

  test('isConfigured reflects the presence of baseUrl', () => {
    expect(client.isConfigured()).toBe(true)

    spyOnConfig('samApi', { ...structuredClone(baseCfg), baseUrl: null })

    expect(client.isConfigured()).toBe(false)
  })
})

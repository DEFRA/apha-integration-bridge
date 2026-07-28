import Hapi from '@hapi/hapi'
import path from 'node:path'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import {
  test,
  expect,
  describe,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  jest
} from '@jest/globals'

import { metricsCounter } from '../../common/helpers/metrics.js'
import route, * as routeModule from './activity.patch.js'
// imported solely to compare swagger ids — nothing else may come from alpha
import { options as alphaMockOptions } from '../alpha/workorders/activity.patch.js'
import { errorEnvelope } from '../../common/helpers/error-envelope.js'
import { versionPlugin } from '../../common/helpers/versioning.js'
import { clientScopesPlugin } from '../../common/helpers/client-scopes.js'
import { authPlugin } from '../../common/helpers/auth.js'
import { routingPlugin } from '../../common/helpers/routing.js'
import { registerSimpleAuthStrategy } from '../../common/helpers/test-helpers/simple-auth.js'
import { spyOnConfigMany } from '../../common/helpers/test-helpers/config.js'
import { samClient } from '../../lib/sam/index.js'

// Hoisted above the imports by babel. metricsCounter no-ops when metrics
// are disabled (the jest default), so spying downstream would pass
// vacuously — mock the counter itself.
jest.mock('../../common/helpers/metrics.js', () => ({
  metricsCounter: jest.fn(() => Promise.resolve())
}))

const routePath = '/workorders/activity'

// Fixture client ids; pick one per request via the x-test-client header.
// Default is write-scoped.
const WRITE_CLIENT = 'write-client'
const READ_CLIENT = 'read-only-client'

const clients = {
  'fixture-write': { client_ids: [WRITE_CLIENT], scopes: ['pii', 'write'] },
  'fixture-read': { client_ids: [READ_CLIENT], scopes: ['pii'] }
}

const mockLogger = /** @type {any} */ ({
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
})

// Resolved-Not-Required keeps this minimal — the conditional fields are
// only mandatory for Resolved-Completed.
const validPayload = {
  workscheduleid: 'WS-12345',
  workscheduleactivityid: 'WSA-100023',
  activityclosingreason: 'Resolved-Not-Required',
  businessresource: 'forename.surname@apha.gov.uk'
}

const completedConditionalFields = {
  resourcecompletingactivity: 'forename.surname@apha.gov.uk',
  activityactualstartdate: '2025-09-20T15:45:00Z',
  activitycompletiondate: '2025-09-21T15:45:00Z'
}

// defined locally, not imported from the alpha mocks — no coupling to
// mock fixtures
const successBody = {
  code: 'sam-api-success',
  uid: '08d94217-8a85-4962-921b-6c42241b9d3d',
  message: 'Work schedule activity WSA-12345 updated'
}

/** The bridge's masked 502 envelope. */
const expect502 = (res) => {
  expect(res.statusCode).toBe(502)
  expect(JSON.parse(res.payload)).toEqual({
    message: 'An internal server error occurred',
    code: 'BAD_GATEWAY',
    errors: []
  })
}

const expect503 = (res) => {
  expect(res.statusCode).toBe(503)
  expect(JSON.parse(res.payload)).toEqual({
    message: 'An internal server error occurred',
    code: 'SERVICE_UNAVAILABLE',
    errors: []
  })
}

describe('PATCH /workorders/activity', () => {
  // Mirror the production error behaviour: server.js sets abortEarly: false
  // and registers errorEnvelope, versionPlugin and clientScopesPlugin.
  const server = Hapi.server({
    routes: { validate: { options: { abortEarly: false } } }
  })

  beforeAll(async () => {
    await server.register([
      errorEnvelope,
      versionPlugin,
      { plugin: clientScopesPlugin, options: { clients } }
    ])

    // bare test servers have no request.logger, and the handler logs
    server.decorate('request', 'logger', mockLogger)

    registerSimpleAuthStrategy(server, {
      getClientId: (request) => request.headers['x-test-client'] ?? WRITE_CLIENT
    })

    server.route({
      ...route,
      path: routePath
    })
  })

  afterEach(() => {
    // restoreAllMocks unwinds the config spies; the logger fns are plain
    // jest.fn and need clearing or calls leak into log assertions
    jest.restoreAllMocks()

    for (const fn of Object.values(mockLogger)) {
      fn.mockClear()
    }

    /** @type {any} */ metricsCounter.mockClear()
  })

  describe('route configuration', () => {
    test('requires auth, disables response validation, has a distinct swagger id', () => {
      expect(route.options.auth).toEqual({ mode: 'required' })
      expect(route.method).toBe('PATCH')
      // no explicit path — the routing plugin derives it from the
      // filename, find.js-style
      expect(route.path).toBeUndefined()
      // docs-only schemas: validation must stay off (Boom errors would
      // fail it pre-envelope, and failAction logs would carry bodies)
      expect(route.options.response.sample).toBe(0)
      expect(route.options.plugins['hapi-swagger'].id).toBe(
        'workorders-activity-update'
      )
      // must never collide with the alpha mock's id
      expect(route.options.plugins['hapi-swagger'].id).not.toBe(
        alphaMockOptions.plugins['hapi-swagger'].id
      )
    })

    test('reads the endpoint documentation into the swagger notes', () => {
      expect(routeModule.default.options.notes).toContain('## Authentication')
      expect(routeModule.default.options.notes).toContain('## Request payload')
      expect(routeModule.default.options.notes).toContain(
        '## Sam responses (passed through)'
      )
      expect(routeModule.default.options.notes).toContain(
        '## Bridge responses (envelope)'
      )
    })
  })

  describe('registration through the routing plugin', () => {
    /** @type {import('@hapi/hapi').Server} */
    let routed

    beforeAll(async () => {
      // Mount the real routes root so derived paths match production — a
      // manual server.route({...route, path}) would mask a broken export or
      // filename derivation. Also proves mock and real coexist.
      routed = Hapi.server({
        routes: { validate: { options: { abortEarly: false } } }
      })

      routed.decorate('server', 'logger', mockLogger)
      routed.decorate('request', 'logger', mockLogger)

      await routed.register([
        errorEnvelope,
        versionPlugin,
        { plugin: clientScopesPlugin, options: { clients } }
      ])

      registerSimpleAuthStrategy(routed, { clientId: WRITE_CLIENT })

      await routed.register({
        plugin: routingPlugin,
        options: {
          routesDirectory: path.join(
            new URL('.', import.meta.url).pathname,
            '..'
          )
        }
      })
    })

    afterAll(async () => {
      await routed.stop()
    })

    test('registers PATCH /workorders/activity and no unintended variants', () => {
      const table = routed
        .table()
        .map((r) => `${r.method.toUpperCase()} ${r.path}`)

      expect(table).toContain('PATCH /workorders/activity')
      expect(table).toContain('PATCH /alpha/workorders/activity')
      expect(table).not.toContain('PATCH /workorders/alpha')
      expect(table).not.toContain('GET /workorders/activity')
    })

    test('the derived route reaches this handler', async () => {
      const res = await routed.inject({
        method: 'PATCH',
        url: routePath,
        payload: validPayload
      })

      // unconfigured → our handler's fail-closed 503, so the derived
      // registration really wired up THIS handler
      expect503(res)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'SAM write API is not configured: SAM_API_BASE_URL is not set'
      )
    })
  })

  describe('payload validation', () => {
    test.each([
      'workscheduleid',
      'workscheduleactivityid',
      'activityclosingreason',
      'businessresource'
    ])('returns BAD_REQUEST if %s is missing', async (field) => {
      const payload = { ...validPayload }

      delete payload[field]

      const res = await server.inject({
        method: 'PATCH',
        url: routePath,
        payload
      })

      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.payload)).toEqual({
        message: 'Invalid request parameters',
        code: 'BAD_REQUEST',
        errors: [
          { code: 'VALIDATION_ERROR', message: `"${field}" is required` }
        ]
      })
    })

    test.each([
      'resourcecompletingactivity',
      'activityactualstartdate',
      'activitycompletiondate'
    ])(
      'returns BAD_REQUEST if %s is missing when closing reason is Resolved-Completed',
      async (field) => {
        const payload = {
          ...validPayload,
          activityclosingreason: 'Resolved-Completed',
          ...completedConditionalFields
        }

        delete payload[field]

        const res = await server.inject({
          method: 'PATCH',
          url: routePath,
          payload
        })

        expect(res.statusCode).toBe(400)
        expect(JSON.parse(res.payload).errors).toEqual([
          { code: 'VALIDATION_ERROR', message: `"${field}" is required` }
        ])
      }
    )

    test('aggregates every missing mandatory field into one error', async () => {
      const res = await server.inject({
        method: 'PATCH',
        url: routePath,
        payload: {}
      })

      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.payload).errors[0].message).toBe(
        '"workscheduleid" is required. "workscheduleactivityid" is required. "activityclosingreason" is required. "businessresource" is required'
      )
    })

    test('returns BAD_REQUEST for an unknown payload property', async () => {
      const res = await server.inject({
        method: 'PATCH',
        url: routePath,
        payload: { ...validPayload, foo: 'bar' }
      })

      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.payload).errors).toEqual([
        { code: 'VALIDATION_ERROR', message: '"foo" is not allowed' }
      ])
    })

    test('returns the bridge envelope for a malformed JSON body', async () => {
      const res = await server.inject({
        method: 'PATCH',
        url: routePath,
        payload: '{ not json',
        headers: { 'content-type': 'application/json' }
      })

      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.payload)).toEqual({
        message: 'Invalid request payload JSON format',
        code: 'BAD_REQUEST',
        errors: []
      })
    })

    test('returns UNSUPPORTED_VERSION for an unknown API version', async () => {
      const res = await server.inject({
        method: 'PATCH',
        url: routePath,
        payload: validPayload,
        headers: { accept: 'application/vnd.apha.2+json' }
      })

      expect(res.statusCode).toBe(404)
      expect(JSON.parse(res.payload).code).toBe('UNSUPPORTED_VERSION')
    })
  })

  describe('write scope', () => {
    test('returns 401 for an authenticated client without the write scope', async () => {
      const res = await server.inject({
        method: 'PATCH',
        url: routePath,
        payload: validPayload,
        headers: { 'x-test-client': READ_CLIENT }
      })

      expect(res.statusCode).toBe(401)
      expect(JSON.parse(res.payload)).toEqual({
        message: 'Missing write scope',
        code: 'UNAUTHORIZED',
        errors: []
      })
    })

    test('returns 401 for a client absent from the clients config', async () => {
      const res = await server.inject({
        method: 'PATCH',
        url: routePath,
        payload: validPayload,
        headers: { 'x-test-client': 'not-a-known-client' }
      })

      expect(res.statusCode).toBe(401)
      expect(JSON.parse(res.payload).code).toBe('UNAUTHORIZED')
    })

    test('checks the scope before payload validation: 401 wins over 400', async () => {
      const res = await server.inject({
        method: 'PATCH',
        url: routePath,
        payload: { nonsense: true },
        headers: { 'x-test-client': READ_CLIENT }
      })

      expect(res.statusCode).toBe(401)
      expect(JSON.parse(res.payload).code).toBe('UNAUTHORIZED')
    })

    test('a malformed JSON body is still rejected before the scope check', async () => {
      const res = await server.inject({
        method: 'PATCH',
        url: routePath,
        payload: '{ not json',
        headers: {
          'content-type': 'application/json',
          'x-test-client': READ_CLIENT
        }
      })

      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.payload).code).toBe('BAD_REQUEST')
    })

    test('fails closed with 401 when the scopes extension did not run', async () => {
      // no clientScopesPlugin → request.app.scopes is undefined, which
      // must still 401 rather than TypeError into a 500
      const bare = Hapi.server()

      await bare.register([errorEnvelope, versionPlugin])
      bare.decorate('request', 'logger', mockLogger)
      registerSimpleAuthStrategy(bare, { clientId: WRITE_CLIENT })
      bare.route({ ...route, path: routePath })

      const res = await bare.inject({
        method: 'PATCH',
        url: routePath,
        payload: validPayload
      })

      expect(res.statusCode).toBe(401)
      expect(JSON.parse(res.payload).code).toBe('UNAUTHORIZED')
    })
  })

  describe('bearer authentication', () => {
    /** @type {import('@hapi/hapi').Server} */
    let authServer

    beforeAll(async () => {
      // real auth plugin, using the jest setup's trusted issuer (an empty
      // allowlist throws at registration)
      authServer = Hapi.server()

      await authServer.register([errorEnvelope, versionPlugin, authPlugin])
      authServer.decorate('request', 'logger', mockLogger)
      authServer.route({ ...route, path: routePath })
    })

    test.each([
      ['no Authorization header', undefined],
      ['a malformed token', 'Bearer not-a-jwt'],
      ['a non-bearer scheme', 'Basic dXNlcjpwYXNz']
    ])('returns 401 for %s', async (_label, authorization) => {
      const res = await authServer.inject({
        method: 'PATCH',
        url: routePath,
        payload: validPayload,
        headers: authorization ? { authorization } : {}
      })

      expect(res.statusCode).toBe(401)
      expect(JSON.parse(res.payload).code).toBe('UNAUTHORIZED')
    })
  })

  describe('unconfigured (fail closed)', () => {
    test('returns 503 and logs the missing env var, in any environment', async () => {
      const res = await server.inject({
        method: 'PATCH',
        url: routePath,
        payload: validPayload
      })

      expect503(res)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'SAM write API is not configured: SAM_API_BASE_URL is not set'
      )
    })

    test('emits no metric (it measures Sam calls only)', async () => {
      const res = await server.inject({
        method: 'PATCH',
        url: routePath,
        payload: validPayload
      })

      expect503(res)
      expect(metricsCounter).not.toHaveBeenCalled()
    })
  })

  describe('live Sam integration', () => {
    const SAM_BASE = 'https://sam.test/api/sam/v1'
    const TOKEN_URL = 'https://login.test/tenant/oauth2/v2.0/token'
    const WRITE_URL = `${SAM_BASE}/standardwork`
    const SENTINEL_EMAIL = 'sentinel.person@apha.gov.uk'
    const SECRET = 'entra-secret-sentinel'

    const msw = setupServer()

    const samApiConfig = {
      baseUrl: SAM_BASE,
      writePath: '/standardwork',
      requestTimeoutMs: 1000,
      entra: {
        tokenUrl: TOKEN_URL,
        clientId: 'entra-client-id',
        clientSecret: SECRET,
        scope: 'api://sam-app/.default'
      }
    }

    let tokenRequests = 0
    let writeRequests = 0
    /** @type {unknown} */
    let lastWriteBody
    /** @type {string | null} */
    let lastWriteAuth

    const tokenHandler = (accessToken = 'access-token-1') =>
      http.post(TOKEN_URL, () => {
        tokenRequests += 1

        return HttpResponse.json({
          token_type: 'Bearer',
          expires_in: 3600,
          access_token: accessToken
        })
      })

    /** records each write; replies from a queue, last entry repeats */
    const writeHandler = (...replies) =>
      http.patch(WRITE_URL, async ({ request }) => {
        writeRequests += 1
        lastWriteBody = await request.json()
        lastWriteAuth = request.headers.get('authorization')

        const reply =
          replies.length > 1 ? replies.shift() : replies[replies.length - 1]

        return reply()
      })

    const samJson = (status, body) => () => HttpResponse.json(body, { status })

    beforeAll(() => {
      msw.listen({ onUnhandledRequest: 'error' })
    })

    beforeEach(() => {
      tokenRequests = 0
      writeRequests = 0
      lastWriteBody = undefined
      lastWriteAuth = null
    })

    afterEach(() => {
      msw.resetHandlers()
      // reset the singleton's token state or call-count tests flake
      samClient.cachedToken = null
      samClient.expiresAt = 0
      samClient.refreshPromise = null
    })

    afterAll(() => {
      msw.close()
    })

    const injectValid = (headers = {}) => {
      spyOnConfigMany({ samApi: samApiConfig })

      return server.inject({
        method: 'PATCH',
        url: routePath,
        payload: validPayload,
        headers
      })
    }

    test('passes a Sam success response through verbatim', async () => {
      msw.use(tokenHandler(), writeHandler(samJson(200, successBody)))

      const res = await injectValid()

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.payload)).toEqual(successBody)
      expect(lastWriteBody).toEqual(validPayload)
      expect(lastWriteAuth).toBe('Bearer access-token-1')
      expect(metricsCounter).toHaveBeenCalledWith('samWriteRequest', 1, {
        outcome: 'success'
      })
    })

    test.each([
      [400, { code: 'sam-api-error-ws-not-found', uid: 'u1', message: 'nope' }],
      [403, { code: 'sam-api-error-ws-closed', uid: 'u2', message: 'closed' }],
      [
        405,
        { code: 'sam-api-error-invalid-class-type', uid: 'u3', message: 'no' }
      ],
      [409, { code: 'sam-api-error-wsa-locked', uid: 'u4', message: 'locked' }]
    ])(
      'passes a Sam %i business error through verbatim',
      async (status, body) => {
        msw.use(tokenHandler(), writeHandler(samJson(status, body)))

        const res = await injectValid()

        expect(res.statusCode).toBe(status)
        expect(JSON.parse(res.payload)).toEqual(body)
        // a recognised business error is still a completed Sam call
        expect(metricsCounter).toHaveBeenCalledWith('samWriteRequest', 1, {
          outcome: 'success'
        })
      }
    )

    test.each([
      ['an object', successBody],
      ['a JSON string', 'ok'],
      ['JSON null', null],
      ['a boolean', true],
      ['a number', 42],
      ['an array', [{ code: 'sam-api-success' }]]
    ])('reproduces %s body byte-for-byte on the wire', async (_label, body) => {
      msw.use(tokenHandler(), writeHandler(samJson(200, body)))

      const res = await injectValid()

      expect(res.statusCode).toBe(200)
      // the raw payload must round-trip: handing a JSON string or null to
      // h.response() directly would send `ok` as text/html and null as an
      // empty body
      expect(res.payload).toBe(JSON.stringify(body))
      expect(res.headers['content-type']).toContain('application/json')
    })

    test('ignores x-test-scenario entirely: an arbitrary value still reaches Sam', async () => {
      // mock-endpoint vocabulary — the real route neither validates nor
      // reads it, so a value the alpha enum would 400 passes through
      msw.use(tokenHandler(), writeHandler(samJson(200, successBody)))

      const res = await injectValid({ 'x-test-scenario': 'not-a-scenario' })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.payload)).toEqual(successBody)
      expect(writeRequests).toBe(1)
    })

    test('reuses the cached token across requests', async () => {
      msw.use(tokenHandler(), writeHandler(samJson(200, successBody)))

      await injectValid()
      await injectValid()

      expect(writeRequests).toBe(2)
      expect(tokenRequests).toBe(1)
    })

    test('re-authenticates and retries once when Sam rejects the token', async () => {
      msw.use(
        tokenHandler(),
        writeHandler(samJson(401, {}), samJson(200, successBody))
      )

      const res = await injectValid()

      expect(res.statusCode).toBe(200)
      expect(writeRequests).toBe(2)
      expect(tokenRequests).toBe(2)
    })

    test('returns 502 when Sam rejects the token twice', async () => {
      msw.use(tokenHandler(), writeHandler(samJson(401, {})))

      const res = await injectValid()

      expect502(res)
      expect(writeRequests).toBe(2)
      expect(metricsCounter).toHaveBeenCalledWith('samWriteRequest', 1, {
        outcome: 'upstreamError'
      })
    })

    test('returns 502 with a single write attempt when re-authentication fails', async () => {
      let calls = 0

      msw.use(
        http.post(TOKEN_URL, () => {
          tokenRequests += 1
          calls += 1

          return calls === 1
            ? HttpResponse.json({ expires_in: 3600, access_token: 'tok' })
            : HttpResponse.json({ error: 'invalid_client' }, { status: 400 })
        }),
        writeHandler(samJson(401, {}))
      )

      const res = await injectValid()

      expect502(res)
      expect(writeRequests).toBe(1)
    })

    test('returns 502 when the token endpoint redirects', async () => {
      msw.use(
        http.post(
          TOKEN_URL,
          () =>
            new HttpResponse(null, {
              status: 307,
              headers: { Location: 'https://elsewhere.test/token' }
            })
        ),
        writeHandler(samJson(200, successBody))
      )

      expect502(await injectValid())
      // refused before any credential is resent
      expect(writeRequests).toBe(0)
    })

    test('returns 502 when the Sam write endpoint redirects', async () => {
      msw.use(
        tokenHandler(),
        writeHandler(
          () =>
            new HttpResponse(null, {
              status: 308,
              headers: { Location: 'https://elsewhere.test/standardwork' }
            })
        )
      )

      expect502(await injectValid())
      // refused rather than replaying the payload elsewhere
      expect(writeRequests).toBe(1)
    })

    test.each([
      ['a 500 from Sam', samJson(500, { detail: 'internal stack trace' })],
      [
        'a 4xx without a sam-api- code',
        samJson(404, { message: 'no such route' })
      ],
      [
        'a non-JSON body',
        () => new HttpResponse('<html>gateway</html>', { status: 200 })
      ],
      ['a network failure', () => HttpResponse.error()]
    ])('returns 502 for %s', async (_label, reply) => {
      msw.use(tokenHandler(), writeHandler(reply))

      expect502(await injectValid())
    })

    test('returns 502 when the token endpoint fails', async () => {
      msw.use(
        http.post(TOKEN_URL, () =>
          HttpResponse.json({ error: 'invalid_client' }, { status: 401 })
        ),
        writeHandler(samJson(200, successBody))
      )

      expect502(await injectValid())
      expect(writeRequests).toBe(0)
    })

    test('surfaces a masked 500 (not a 502) for a bridge-side failure', async () => {
      jest
        .spyOn(samClient, 'updateStandardActivity')
        .mockRejectedValue(new Error('entra credentials are not configured'))

      const res = await injectValid()

      expect(res.statusCode).toBe(500)
      expect(JSON.parse(res.payload)).toEqual({
        message: 'An internal server error occurred',
        code: 'INTERNAL_SERVER_ERROR',
        errors: []
      })
      // metric still recorded before the rethrow
      expect(metricsCounter).toHaveBeenCalledWith('samWriteRequest', 1, {
        outcome: 'bridgeError'
      })
    })

    test('never logs Sam message text, the token or the secret', async () => {
      msw.use(
        tokenHandler(),
        writeHandler(
          samJson(500, {
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
        )
      )

      expect502(await injectValid())

      const logged = JSON.stringify(
        Object.values(mockLogger).map((fn) => fn.mock.calls)
      )

      expect(logged).not.toContain(SENTINEL_EMAIL)
      expect(logged).not.toContain(SECRET)
      expect(logged).not.toContain('access-token-1')
      // the safe ids ARE logged
      expect(logged).toContain('WS-12345')
    })
  })
})

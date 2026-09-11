import Hapi from '@hapi/hapi'
import { Collection, MongoClient } from 'mongodb'
import { RateLimiterMemory } from 'rate-limiter-flexible'
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

import { rateLimitPlugin } from './rate-limit.js'
import { config } from '../../config.js'

const CLIENT_ID = 'mongo-backed-client'

const mockAuthPlugin = {
  name: 'mock-auth',
  version: '1.0.0',
  register: async function (server) {
    server.auth.scheme('mock', () => ({
      authenticate: async (request, h) =>
        h.authenticated({
          credentials: { id: CLIENT_ID, client_id: CLIENT_ID }
        })
    }))

    server.auth.strategy('default', 'mock')
    server.auth.default('default')
  }
}

const stubLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn()
})

/**
 * These tests exercise the real RateLimiterMongo path (as opposed to
 * rate-limit.test.js, which always runs against the in-memory limiter)
 * against the in-memory MongoDB instance @shelf/jest-mongodb starts for
 * the whole test suite (see jest-mongodb-config.js).
 */
describe('Rate Limit Plugin (MongoDB-backed)', () => {
  let mongoClient
  let db
  let server

  beforeAll(async () => {
    mongoClient = await MongoClient.connect(config.get('mongo').uri)
    db = mongoClient.db(config.get('mongo').databaseName)
  })

  afterAll(async () => {
    await mongoClient.close()
  })

  beforeEach(() => {
    config.set('rateLimit.points', 3)
    config.set('rateLimit.duration', 5)
  })

  afterEach(async () => {
    config.set('rateLimit.points', 10)
    config.set('rateLimit.duration', 1)
    jest.restoreAllMocks()

    if (server) {
      await server.stop({ timeout: 0 })
      server = undefined
    }

    await db.collection('rate-limits').deleteMany({})
  })

  const buildServer = async () => {
    const s = Hapi.server()
    const decorate = /** @type {any} */ (s.decorate.bind(s))
    decorate('server', 'logger', stubLogger(), { override: true })
    decorate('server', 'db', db)

    await s.register({ plugin: mockAuthPlugin })
    await s.register({ plugin: rateLimitPlugin })

    s.route({
      method: 'GET',
      path: '/api/test',
      handler: () => ({ message: 'success' })
    })

    await s.initialize()
    return s
  }

  const makeRequest = (s) =>
    s.inject({
      method: 'GET',
      url: '/api/test',
      headers: { authorization: 'Bearer test' }
    })

  test('allows requests under the limit and blocks (429) once exceeded, using the real Mongo-backed limiter', async () => {
    server = await buildServer()

    for (let i = 0; i < 3; i++) {
      const res = await makeRequest(server)
      expect(res.statusCode).toBe(200)
    }

    // The store itself now rejects consume() with a genuine "limit
    // exceeded" RateLimiterRes - still a 429 with a sensible Retry-After.
    const blocked = await makeRequest(server)
    expect(blocked.statusCode).toBe(429)
    expect(blocked.result.message).toMatch(/rate limit exceeded/i)
    expect(blocked.headers['retry-after']).toBeDefined()
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0)
    expect(blocked.headers['x-ratelimit-remaining']).toBe('0')
  })

  test('boots twice with different rate-limit durations without failing', async () => {
    server = await buildServer()
    await server.stop({ timeout: 0 })

    config.set('rateLimit.duration', 30)

    // Would previously throw at registration: Mongo refuses to (re)create
    // the TTL index with a different expireAfterSeconds.
    server = await buildServer()

    const res = await makeRequest(server)
    expect(res.statusCode).toBe(200)
  })

  test('falls back to the in-memory limiter and logs a warning once when the Mongo store errors', async () => {
    server = await buildServer()

    jest
      .spyOn(Collection.prototype, 'findOneAndUpdate')
      .mockRejectedValue(new Error('connection lost'))

    for (let i = 0; i < 3; i++) {
      const res = await makeRequest(server)
      expect(res.statusCode).toBe(200)
    }

    const blocked = await makeRequest(server)
    expect(blocked.statusCode).toBe(429)
    expect(blocked.headers['retry-after']).toBeDefined()
    expect(blocked.headers['x-ratelimit-remaining']).toBe('0')

    expect(server.logger.warn).toHaveBeenCalledTimes(1)
    expect(server.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      expect.stringMatching(/falling back/i)
    )
  })

  test('returns 503 with a Retry-After header, no rate-limit headers, and logs an error when both the store and the fallback fail', async () => {
    server = await buildServer()

    jest
      .spyOn(Collection.prototype, 'findOneAndUpdate')
      .mockRejectedValue(new Error('connection lost'))
    jest
      .spyOn(RateLimiterMemory.prototype, 'consume')
      .mockRejectedValue(new Error('in-memory fallback exploded'))

    const res = await makeRequest(server)

    expect(res.statusCode).toBe(503)
    expect(res.headers['retry-after']).toBeDefined()
    expect(res.headers['x-ratelimit-limit']).toBeUndefined()
    expect(res.headers['x-ratelimit-remaining']).toBeUndefined()

    expect(server.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      expect.stringMatching(/rate limiter/i)
    )
  })
})

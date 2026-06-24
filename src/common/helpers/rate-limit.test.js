import Hapi from '@hapi/hapi'
import { describe, beforeEach, afterEach, test, expect } from '@jest/globals'

import { rateLimitPlugin } from './rate-limit.js'
import { config } from '../../config.js'

const CLIENT_ID = 'test-client-123'
const CLIENT_ID_2 = 'test-client-456'
const points = config.get('rateLimit').points

const mockAuthPlugin = {
  name: 'mock-auth',
  version: '1.0.0',
  register: async function (server) {
    server.auth.scheme('mock', () => ({
      authenticate: async (request, h) => {
        const authHeader = request.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
          throw new Error('Missing or invalid authorization header')
        }

        const token = authHeader.substring(7)
        const clientId = token.startsWith('client:')
          ? token.substring(7)
          : CLIENT_ID

        return h.authenticated({
          credentials: { id: clientId, client_id: clientId }
        })
      }
    }))

    server.auth.strategy('default', 'mock')
    server.auth.default('default')
  }
}

describe('Rate Limit Plugin', () => {
  let server

  beforeEach(async () => {
    server = Hapi.server()
    await server.register({ plugin: mockAuthPlugin })
    await server.register({ plugin: rateLimitPlugin })

    server.route([
      {
        method: 'GET',
        path: '/health',
        options: { auth: false, handler: () => ({ status: 'ok' }) }
      },
      {
        method: 'GET',
        path: '/api/test',
        handler: () => ({ message: 'success' })
      }
    ])

    await server.initialize()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('allows requests under the rate limit', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/test',
      headers: { authorization: `Bearer client:${CLIENT_ID}` }
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['x-ratelimit-limit']).toBe(String(points))
    expect(res.headers['x-ratelimit-remaining']).toBe(String(points - 1))
    expect(res.headers['x-ratelimit-reset']).toBeDefined()
  })

  test('blocks requests exceeding the rate limit', async () => {
    // Exhaust the limit
    for (let i = 0; i < points; i++) {
      await server.inject({
        method: 'GET',
        url: '/api/test',
        headers: { authorization: `Bearer client:${CLIENT_ID}` }
      })
    }

    // Should be blocked
    const res = await server.inject({
      method: 'GET',
      url: '/api/test',
      headers: { authorization: `Bearer client:${CLIENT_ID}` }
    })

    expect(res.statusCode).toBe(429)
    expect(res.result.message).toMatch(/rate limit exceeded/i)
    expect(res.headers['retry-after']).toBeDefined()
    expect(res.headers['x-ratelimit-remaining']).toBe('0')
  })

  test('includes all required headers', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/test',
      headers: { authorization: `Bearer client:${CLIENT_ID}` }
    })

    expect(res.headers['x-ratelimit-limit']).toBeDefined()
    expect(res.headers['x-ratelimit-remaining']).toBeDefined()
    expect(res.headers['x-ratelimit-reset']).toBeDefined()
  })

  test('includes Retry-After header when rate limited', async () => {
    // Exhaust the limit
    for (let i = 0; i < points; i++) {
      await server.inject({
        method: 'GET',
        url: '/api/test',
        headers: { authorization: `Bearer client:${CLIENT_ID}` }
      })
    }

    const res = await server.inject({
      method: 'GET',
      url: '/api/test',
      headers: { authorization: `Bearer client:${CLIENT_ID}` }
    })

    expect(res.statusCode).toBe(429)
    expect(res.headers['retry-after']).toBeDefined()
  })

  test('rate limits are applied per client', async () => {
    // Exhaust limit for client 1
    for (let i = 0; i < points; i++) {
      await server.inject({
        method: 'GET',
        url: '/api/test',
        headers: { authorization: `Bearer client:${CLIENT_ID}` }
      })
    }

    // Client 1 should be blocked
    const res1 = await server.inject({
      method: 'GET',
      url: '/api/test',
      headers: { authorization: `Bearer client:${CLIENT_ID}` }
    })
    expect(res1.statusCode).toBe(429)

    // Client 2 should still work
    const res2 = await server.inject({
      method: 'GET',
      url: '/api/test',
      headers: { authorization: `Bearer client:${CLIENT_ID_2}` }
    })
    expect(res2.statusCode).toBe(200)
  })

  test('/health endpoint is exempt from rate limiting', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['x-ratelimit-limit']).toBeUndefined()
  })
})

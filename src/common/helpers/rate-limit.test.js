import Hapi from '@hapi/hapi'
import { describe, beforeEach, afterEach, test, expect } from '@jest/globals'
import { generateKeyPair, SignJWT } from 'jose'

import { rateLimitPlugin } from './rate-limit.js'
import { bearerTokenPlugin } from './bearer-token.js'

const ISSUER = 'https://mock-cognito'
const CLIENT_ID = 'test-client-123'

describe('Rate Limit Plugin', () => {
  let server
  let token
  let privateKey

  beforeEach(async () => {
    const keypair = await generateKeyPair('RS256')
    privateKey = keypair.privateKey

    // Generate valid token with client_id
    const now = Math.floor(Date.now() / 1000)

    token = await new SignJWT({
      sub: 'test-user',
      client_id: CLIENT_ID,
      iss: ISSUER,
      token_use: 'access'
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'mock-key-id' })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey)

    server = Hapi.server()

    await server.register({ plugin: bearerTokenPlugin })
    await server.register({ plugin: rateLimitPlugin })

    server.route([
      {
        method: 'GET',
        path: '/health',
        options: {
          auth: false,
          handler: () => ({ status: 'ok' })
        }
      },
      {
        method: 'GET',
        path: '/api/test',
        options: {
          auth: {
            mode: 'required'
          },
          handler: () => ({ message: 'success' })
        }
      },
      {
        method: 'GET',
        path: '/api/limited',
        options: {
          auth: {
            mode: 'required'
          },
          handler: () => ({ message: 'another endpoint' })
        }
      }
    ])

    await server.initialize()
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('Rate Limiting Behavior', () => {
    test('allows requests under the rate limit', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/test',
        headers: { authorization: `Bearer ${token}` }
      })

      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ message: 'success' })
      expect(res.headers['x-ratelimit-limit']).toBe('10')
      expect(res.headers['x-ratelimit-remaining']).toBe('9')
      expect(res.headers['x-ratelimit-reset']).toBeDefined()
    })

    test('blocks requests exceeding the rate limit', async () => {
      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        const res = await server.inject({
          method: 'GET',
          url: '/api/test',
          headers: { authorization: `Bearer ${token}` }
        })
        expect(res.statusCode).toBe(200)
      }

      // 11th request should be blocked
      const res = await server.inject({
        method: 'GET',
        url: '/api/test',
        headers: { authorization: `Bearer ${token}` }
      })

      expect(res.statusCode).toBe(429)
      expect(res.result.message).toMatch(/rate limit exceeded/i)
      expect(res.headers['retry-after']).toBeDefined()
      expect(res.headers['x-ratelimit-remaining']).toBe('0')
    })

    test('bypasses rate limiting for exempt paths', async () => {
      // Make many requests to exempt path
      for (let i = 0; i < 20; i++) {
        const res = await server.inject({
          method: 'GET',
          url: '/health'
        })
        expect(res.statusCode).toBe(200)
        expect(res.headers['x-ratelimit-limit']).toBeUndefined()
      }
    })
  })

  describe('Rate Limit Headers', () => {
    test('includes all standard rate limit headers on successful requests', async () => {
      const beforeRequest = Math.floor(Date.now() / 1000)

      // First request
      const res1 = await server.inject({
        method: 'GET',
        url: '/api/test',
        headers: { authorization: `Bearer ${token}` }
      })

      expect(res1.headers['x-ratelimit-limit']).toBe('10')
      expect(res1.headers['x-ratelimit-remaining']).toBe('9')
      const resetTime1 = parseInt(res1.headers['x-ratelimit-reset'], 10)
      expect(resetTime1).toBeGreaterThan(beforeRequest)
      expect(resetTime1).toBeLessThan(beforeRequest + 61) // Within duration window

      // Second request to verify remaining count decrements
      const res2 = await server.inject({
        method: 'GET',
        url: '/api/test',
        headers: { authorization: `Bearer ${token}` }
      })

      expect(res2.headers['x-ratelimit-remaining']).toBe('8')
    })

    test('includes Retry-After header when rate limit exceeded', async () => {
      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        await server.inject({
          method: 'GET',
          url: '/api/test',
          headers: { authorization: `Bearer ${token}` }
        })
      }

      const res = await server.inject({
        method: 'GET',
        url: '/api/test',
        headers: { authorization: `Bearer ${token}` }
      })

      expect(res.statusCode).toBe(429)
      expect(res.headers['retry-after']).toBeDefined()
      const retryAfter = parseInt(res.headers['retry-after'], 10)
      expect(retryAfter).toBeGreaterThan(0)
      expect(retryAfter).toBeLessThanOrEqual(60)
    })
  })

  describe('Error Handling', () => {
    test('returns 429 with proper error message', async () => {
      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        await server.inject({
          method: 'GET',
          url: '/api/test',
          headers: { authorization: `Bearer ${token}` }
        })
      }

      const res = await server.inject({
        method: 'GET',
        url: '/api/test',
        headers: { authorization: `Bearer ${token}` }
      })

      expect(res.statusCode).toBe(429)
      expect(res.result.statusCode).toBe(429)
      expect(res.result.error).toBe('Too Many Requests')
      expect(res.result.message).toMatch(/rate limit exceeded/i)
    })

    test('continues to block requests after limit exceeded', async () => {
      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        await server.inject({
          method: 'GET',
          url: '/api/test',
          headers: { authorization: `Bearer ${token}` }
        })
      }

      // Try multiple times after limit
      for (let i = 0; i < 5; i++) {
        const res = await server.inject({
          method: 'GET',
          url: '/api/test',
          headers: { authorization: `Bearer ${token}` }
        })
        expect(res.statusCode).toBe(429)
      }
    })
  })
})

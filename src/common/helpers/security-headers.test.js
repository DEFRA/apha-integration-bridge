import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import Hapi from '@hapi/hapi'
import Boom from '@hapi/boom'

import { securityHeaders } from './security-headers.js'

/**
 * @typedef {import('@hapi/hapi').Server} Server
 */

describe('securityHeaders plugin', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = Hapi.server({ port: 0 })
    await server.register(securityHeaders)

    server.route([
      {
        method: 'GET',
        path: '/api/test',
        handler: () => ({ data: 'test' })
      },
      {
        method: 'GET',
        path: '/api/error',
        handler: () => {
          throw Boom.badRequest('Invalid request')
        }
      },
      {
        method: 'GET',
        path: '/documentation/scalar',
        handler: (_request, h) => h.response('<html></html>').type('text/html')
      },
      {
        method: 'GET',
        path: '/swaggerui/assets/file.js',
        handler: (_request, h) => h.response('/* code */').type('text/js')
      }
    ])
  })

  afterAll(async () => {
    await server.stop()
  })

  test('API routes receive all security headers', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/test' })

    expect(res.statusCode).toBe(200)
    expect(res.headers['referrer-policy']).toBe('no-referrer')
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin')
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin')
    expect(res.headers['permissions-policy']).toBe(
      'camera=(), microphone=(), geolocation=(), browsing-topics=()'
    )
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    )
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.headers['pragma']).toBe('no-cache')
  })

  test('error responses receive all security headers', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/error' })

    expect(res.statusCode).toBe(400)
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    )
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.headers['pragma']).toBe('no-cache')
  })

  test('documentation routes omit CSP and strict cache headers', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/documentation/scalar'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['referrer-policy']).toBe('no-referrer')
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin')
    expect(res.headers['content-security-policy']).toBeUndefined()
    expect(res.headers['pragma']).toBeUndefined()
    expect(res.headers['cache-control']).not.toBe('no-store')
  })

  test('swaggerui routes omit CSP and strict cache headers', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/swaggerui/assets/file.js'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeUndefined()
    expect(res.headers['pragma']).toBeUndefined()
    expect(res.headers['cache-control']).not.toBe('no-store')
  })
})

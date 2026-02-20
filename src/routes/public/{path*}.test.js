import { createServer } from '../../server.js'
import { test, expect, describe, beforeAll, afterAll } from '@jest/globals'

describe('GET /public/{path*}', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('serves cognito-auth.js file', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/public/cognito-auth.js'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/javascript')
    expect(res.result).toContain('waitForSwaggerUI')
    expect(res.result).toContain('installFetchInterceptor')
  })

  test('returns 404 for non-existent files', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/public/non-existent-file.js'
    })

    expect(res.statusCode).toBe(404)
  })

  test('does not require authentication', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/public/cognito-auth.js',
      headers: {}
    })

    expect(res.statusCode).toBe(200)
  })
})

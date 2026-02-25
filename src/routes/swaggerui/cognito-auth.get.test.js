import { createServer } from '../../server.js'
import { test, expect, describe, beforeAll, afterAll } from '@jest/globals'

describe('GET /swaggerui/cognito-auth', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('serves cognito-auth script with injected config', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/swaggerui/cognito-auth'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('application/javascript')
    expect(res.result).toContain('window.COGNITO_TOKEN_URL')
    expect(res.result).toContain('installFetchInterceptor')
    expect(res.result).toContain('preauthorizeApiKey')
  })

  test('does not require authentication', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/swaggerui/cognito-auth',
      headers: {}
    })

    expect(res.statusCode).toBe(200)
  })
})

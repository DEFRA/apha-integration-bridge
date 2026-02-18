import { describe, beforeAll, afterAll, test, expect } from '@jest/globals'
import Hapi from '@hapi/hapi'

import { handler, options } from './documentation.get.js'

describe('GET /documentation', () => {
  let server

  beforeAll(async () => {
    server = Hapi.server()

    server.route({
      method: 'GET',
      path: '/documentation',
      options,
      handler
    })
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('does not require authentication', () => {
    expect(options.auth).toBe(false)
  })

  test('serves Scalar API reference HTML', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/documentation'
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toMatch(/^text\/html/)
    expect(response.payload).toContain('@scalar/api-reference')
    expect(response.payload).toContain('Scalar.createApiReference')
    expect(response.payload).toContain('/.well-known/openapi/v1/openapi.json')
  })
})

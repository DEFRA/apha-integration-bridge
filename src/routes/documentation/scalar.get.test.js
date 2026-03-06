import {
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  test,
  expect
} from '@jest/globals'
import Hapi from '@hapi/hapi'

import { config } from '../../config.js'
import route, { options } from './scalar.get.js'

describe('GET /documentation/scalar', () => {
  let server
  const originalTokenUrl = config.get('cognito.tokenUrl')

  beforeAll(async () => {
    server = Hapi.server()
    server.route(route)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    config.set('cognito.tokenUrl', originalTokenUrl)
  })

  afterEach(() => {
    config.set('cognito.tokenUrl', originalTokenUrl)
  })

  test('does not require authentication', () => {
    expect(options.auth).toBe(false)
  })

  test('serves Scalar API reference HTML', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/documentation/scalar'
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toMatch(/^text\/html/)
    expect(response.payload).toContain('@scalar/api-reference')
    expect(response.payload).toContain('Scalar.createApiReference')
    expect(response.payload).toContain('/.well-known/openapi/v1/openapi.json')
    expect(response.payload).toContain("preferredSecurityScheme: 'oauth2'")
    expect(response.payload).toContain('securitySchemes')
    expect(response.payload).toContain('oauth2')
    expect(response.payload).toContain('clientCredentials')
    expect(response.payload).toContain('tokenUrl: COGNITO_TOKEN_URL')
    expect(response.payload).toContain(
      "'x-scalar-credentials-location': 'body'"
    )
    expect(response.payload).not.toContain('updateConfiguration')
    expect(response.payload).not.toContain('id="client-id"')
    expect(response.payload).not.toContain('id="client-secret"')
    expect(response.payload).not.toContain('id="apply-auth"')
  })

  test('interpolates fake token URL from config into resolved HTML', async () => {
    const fakeTokenUrl = 'https://example.invalid/oauth2/token'
    config.set('cognito.tokenUrl', fakeTokenUrl)

    const response = await server.inject({
      method: 'GET',
      url: '/documentation/scalar'
    })

    expect(response.payload).not.toContain('{{tokenUrl}}')
    expect(response.payload).toContain(fakeTokenUrl)
    expect(response.payload).toContain(
      `const COGNITO_TOKEN_URL = '${fakeTokenUrl}'`
    )
  })
})

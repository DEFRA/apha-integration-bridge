import Hapi from '@hapi/hapi'
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals'
import { SignJWT, generateKeyPair, exportJWK } from 'jose'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

import { authPlugin } from './auth.js'

// Constants
const ISSUER = 'https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_TEST'
const CLIENT_ID = 'test-client-id'
const JWKS_PATH = '/.well-known/jwks.json'

// MSW server for mocking JWKS endpoint
const msw = setupServer()

describe('Auth Plugin (Full JWT Signature Verification)', () => {
  let server
  let token
  let privateKey
  let publicJwk

  beforeAll(async () => {
    // Generate key pair for signing test tokens
    const keypair = await generateKeyPair('RS256')
    privateKey = keypair.privateKey

    // Export public key as JWK for JWKS endpoint
    publicJwk = await exportJWK(keypair.publicKey)
    publicJwk.kid = 'mock-key-id'
    publicJwk.use = 'sig'
    publicJwk.alg = 'RS256'

    // Set env
    process.env.AUTH_SCOPE = 'apha-integration-bridge-resource-srv/access'

    // Mock JWKS endpoint
    msw.use(
      http.get(`${ISSUER}${JWKS_PATH}`, () => {
        return HttpResponse.json({ keys: [publicJwk] })
      })
    )

    msw.listen({ onUnhandledRequest: 'bypass' })

    // Generate valid token
    const now = Math.floor(Date.now() / 1000)

    token = await new SignJWT({
      sub: 'test-user',
      iss: ISSUER,
      token_use: 'access',
      scope: 'apha-integration-bridge-resource-srv/access',
      client_id: CLIENT_ID
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'mock-key-id' })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey)

    // Set up HAPI server
    server = Hapi.server()

    await server.register({ plugin: authPlugin })

    server.route([
      {
        method: 'GET',
        path: '/open',
        options: {
          auth: {
            mode: 'try'
          },
          handler: () => ({ message: 'no auth required' })
        }
      },
      {
        method: 'GET',
        path: '/secure',
        options: {
          auth: {
            mode: 'required'
          },
          handler: (request) => {
            return {
              message: 'auth required',
              user: request.auth.artifacts.sub
            }
          }
        }
      }
    ])

    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
    msw.close()
  })

  test('allows unauthenticated request to open route', async () => {
    const res = await server.inject({ method: 'GET', url: '/open' })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ message: 'no auth required' })
  })

  test('rejects missing Authorization header on secure route', async () => {
    const res = await server.inject({ method: 'GET', url: '/secure' })

    expect(res.statusCode).toBe(401)
    expect(res.result.message).toBe('Authentication failed')
  })

  test('rejects token with invalid scope', async () => {
    const now = Math.floor(Date.now() / 1000)

    const badToken = await new SignJWT({
      sub: 'test-user',
      iss: ISSUER,
      token_use: 'access',
      scope: 'something-else',
      client_id: CLIENT_ID
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'mock-key-id' })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey)

    const res = await server.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${badToken}` }
    })

    expect(res.statusCode).toBe(403)
    expect(res.result.message).toBe('Insufficient permissions')
  })

  test('rejects token with missing client_id', async () => {
    const now = Math.floor(Date.now() / 1000)

    const badToken = await new SignJWT({
      sub: 'test-user',
      iss: ISSUER,
      token_use: 'access',
      scope: 'apha-integration-bridge-resource-srv/access'
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'mock-key-id' })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey)

    const res = await server.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${badToken}` }
    })

    expect(res.statusCode).toBe(401)
    expect(res.result.message).toBe('Authentication failed')
  })

  test('rejects expired token', async () => {
    const now = Math.floor(Date.now() / 1000)

    const expiredToken = await new SignJWT({
      sub: 'test-user',
      iss: ISSUER,
      token_use: 'access',
      scope: 'apha-integration-bridge-resource-srv/access',
      client_id: CLIENT_ID
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'mock-key-id' })
      .setIssuedAt(now - 3660)
      .setExpirationTime(now - 60) // Expired 60 seconds ago
      .sign(privateKey)

    const res = await server.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${expiredToken}` }
    })

    expect(res.statusCode).toBe(401)
    expect(res.result.message).toMatch(/expired/i)
  })

  test('allows valid token on secure route', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${token}` }
    })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({
      message: 'auth required',
      user: 'test-user'
    })
  })

  test('uses cached JWKS on subsequent requests', async () => {
    let jwksCallCount = 0

    msw.use(
      http.get(`${ISSUER}${JWKS_PATH}`, () => {
        jwksCallCount++
        return HttpResponse.json({ keys: [publicJwk] })
      })
    )

    // Make first request - should fetch JWKS
    const res1 = await server.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${token}` }
    })

    expect(res1.statusCode).toBe(200)
    const callsAfterFirst = jwksCallCount

    // Make second request - should use cached JWKS
    const res2 = await server.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${token}` }
    })

    expect(res2.statusCode).toBe(200)

    expect(jwksCallCount).toBe(callsAfterFirst)
  })
})

import Hapi from '@hapi/hapi'
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals'
import { SignJWT, generateKeyPair, generateSecret, exportJWK } from 'jose'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

import { authPlugin } from './auth.js'
import { config } from '../../config.js'

// Constants
const ISSUER = 'https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_TEST'
const UNTRUSTED_ISSUER =
  'https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_EVIL'
const CLIENT_ID = 'test-client-id'
const JWKS_PATH = '/.well-known/jwks.json'

// MSW server for mocking JWKS endpoint
const msw = setupServer()

describe('Auth Plugin (Full JWT Signature Verification)', () => {
  let server
  let token
  let privateKey
  let publicJwk

  /**
   * Signs a JWT for tests. Defaults to a valid RS256 access token for ISSUER.
   */
  const signToken = async ({
    claims = {},
    header = { alg: 'RS256', kid: 'mock-key-id' },
    key = privateKey,
    expiresInSeconds = 3600
  } = {}) => {
    const now = Math.floor(Date.now() / 1000)
    return new SignJWT(claims)
      .setProtectedHeader(header)
      .setIssuedAt(now)
      .setExpirationTime(now + expiresInSeconds)
      .sign(key)
  }

  /**
   * Builds a fresh Hapi server with the auth plugin registered and a single
   * protected route. A fresh server means a fresh (cold) JWKS resolver, which
   * lets tests assert first-fetch / no-fetch behaviour deterministically.
   */
  const buildSecureServer = async () => {
    const s = Hapi.server()
    await s.register({ plugin: authPlugin })
    s.route({
      method: 'GET',
      path: '/secure',
      options: {
        auth: { mode: 'required' },
        handler: (request) => ({
          message: 'auth required',
          user: request.auth.artifacts.sub
        })
      }
    })
    await s.initialize()
    return s
  }

  /**
   * Installs a JWKS handler for the given issuer that counts fetches. msw.use
   * prepends, so this shadows any earlier handler for the same URL.
   */
  const countingJwks = (issuer) => {
    const counter = { count: 0 }
    msw.use(
      http.get(`${issuer}${JWKS_PATH}`, () => {
        counter.count++
        return HttpResponse.json({ keys: [publicJwk] })
      })
    )
    return counter
  }

  beforeAll(async () => {
    // Generate key pair for signing test tokens
    const keypair = await generateKeyPair('RS256')
    privateKey = keypair.privateKey

    // Export public key as JWK for JWKS endpoint
    publicJwk = await exportJWK(keypair.publicKey)
    publicJwk.kid = 'mock-key-id'
    publicJwk.use = 'sig'
    publicJwk.alg = 'RS256'

    // Set env. AUTH_ALLOWED_ISSUERS is provided globally by .jest/setup-files.js
    // and matches ISSUER above.
    process.env.AUTH_SCOPE = 'apha-integration-bridge-resource-srv/access'

    // Mock JWKS endpoint
    msw.use(
      http.get(`${ISSUER}${JWKS_PATH}`, () => {
        return HttpResponse.json({ keys: [publicJwk] })
      })
    )

    msw.listen({ onUnhandledRequest: 'bypass' })

    // Generate valid token
    token = await signToken({
      claims: {
        sub: 'test-user',
        iss: ISSUER,
        token_use: 'access',
        scope: 'apha-integration-bridge-resource-srv/access',
        client_id: CLIENT_ID
      }
    })

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
    const badToken = await signToken({
      claims: {
        sub: 'test-user',
        iss: ISSUER,
        token_use: 'access',
        scope: 'something-else',
        client_id: CLIENT_ID
      }
    })

    const res = await server.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${badToken}` }
    })

    expect(res.statusCode).toBe(403)
    expect(res.result.message).toBe('Insufficient permissions')
  })

  test('allows token holding the required scope among several', async () => {
    const now = Math.floor(Date.now() / 1000)

    const multiScopeToken = await new SignJWT({
      sub: 'test-user',
      iss: ISSUER,
      token_use: 'access',
      scope:
        'other-srv/access apha-integration-bridge-resource-srv/access extra-srv/read',
      client_id: CLIENT_ID
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'mock-key-id' })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey)

    const res = await server.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${multiScopeToken}` }
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toEqual({
      message: 'auth required',
      user: 'test-user'
    })
  })

  test('rejects token with related but non-matching scopes', async () => {
    const now = Math.floor(Date.now() / 1000)

    const badToken = await new SignJWT({
      sub: 'test-user',
      iss: ISSUER,
      token_use: 'access',
      scope: 'other-srv/access extra-srv/read',
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

  test('rejects token with missing scope claim', async () => {
    const now = Math.floor(Date.now() / 1000)

    const badToken = await new SignJWT({
      sub: 'test-user',
      iss: ISSUER,
      token_use: 'access',
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

  test('rejects token whose scope only contains the required scope as a prefix', async () => {
    const now = Math.floor(Date.now() / 1000)

    const badToken = await new SignJWT({
      sub: 'test-user',
      iss: ISSUER,
      token_use: 'access',
      // Membership check is exact per token, so a longer scope sharing the
      // expected scope as a prefix must not be admitted.
      scope: 'apha-integration-bridge-resource-srv/access-admin',
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

  test('rejects token with a non-string scope claim', async () => {
    const now = Math.floor(Date.now() / 1000)

    const badToken = await new SignJWT({
      sub: 'test-user',
      iss: ISSUER,
      token_use: 'access',
      // A malformed (array) scope claim must fail closed rather than match.
      scope: ['apha-integration-bridge-resource-srv/access'],
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
    const badToken = await signToken({
      claims: {
        sub: 'test-user',
        iss: ISSUER,
        token_use: 'access',
        scope: 'apha-integration-bridge-resource-srv/access'
      }
    })

    const res = await server.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${badToken}` }
    })

    expect(res.statusCode).toBe(401)
    expect(res.result.message).toBe('Authentication failed')
  })

  test('rejects expired token', async () => {
    const expiredToken = await signToken({
      claims: {
        sub: 'test-user',
        iss: ISSUER,
        token_use: 'access',
        scope: 'apha-integration-bridge-resource-srv/access',
        client_id: CLIENT_ID
      },
      expiresInSeconds: -60 // Expired 60 seconds ago
    })

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

  test('rejects token from an untrusted issuer without fetching its JWKS', async () => {
    const evilJwks = countingJwks(UNTRUSTED_ISSUER)

    const untrustedToken = await signToken({
      claims: {
        sub: 'attacker',
        iss: UNTRUSTED_ISSUER,
        token_use: 'access',
        scope: 'apha-integration-bridge-resource-srv/access',
        client_id: CLIENT_ID
      }
    })

    const res = await server.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${untrustedToken}` }
    })

    expect(res.statusCode).toBe(401)
    expect(res.result.message).toBe('Authentication failed')
    // The attacker-controlled issuer's JWKS must never be fetched.
    expect(evilJwks.count).toBe(0)
  })

  test('rejects token signed with a disallowed algorithm (HS256) without fetching JWKS', async () => {
    // Cold server + counter: the algorithms pin rejects before key resolution,
    // so no JWKS fetch should occur even though the issuer is trusted.
    const freshServer = await buildSecureServer()
    const jwks = countingJwks(ISSUER)

    const secret = await generateSecret('HS256')
    const hsToken = await signToken({
      claims: {
        sub: 'test-user',
        iss: ISSUER,
        token_use: 'access',
        scope: 'apha-integration-bridge-resource-srv/access',
        client_id: CLIENT_ID
      },
      header: { alg: 'HS256' },
      key: secret
    })

    const res = await freshServer.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${hsToken}` }
    })

    expect(res.statusCode).toBe(401)
    expect(res.result.message).toBe('Authentication failed')
    expect(jwks.count).toBe(0)

    await freshServer.stop()
  })

  test('rejects a structurally malformed token with 401, not 500', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: 'Bearer not-a-jwt' }
    })

    expect(res.statusCode).toBe(401)
    expect(res.result.message).toBe('Authentication failed')
  })

  test('rejects a well-formed token with no iss claim without fetching JWKS', async () => {
    // Cold server + counter: the missing-issuer guard must short-circuit before
    // any verification work, even though the token is signed with a known kid.
    const freshServer = await buildSecureServer()
    const jwks = countingJwks(ISSUER)

    const noIssToken = await signToken({
      claims: {
        sub: 'test-user',
        token_use: 'access',
        scope: 'apha-integration-bridge-resource-srv/access',
        client_id: CLIENT_ID
      }
    })

    const res = await freshServer.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${noIssToken}` }
    })

    expect(res.statusCode).toBe(401)
    expect(res.result.message).toBe('Authentication failed')
    expect(jwks.count).toBe(0)

    await freshServer.stop()
  })

  test('rejects a token whose iss has a trailing-slash variant without fetching JWKS', async () => {
    // The configured issuer (ISSUER, no trailing slash) is matched exactly. A
    // token presenting a trailing-slash variant must fail closed.
    const freshServer = await buildSecureServer()
    const jwks = countingJwks(ISSUER)

    const slashToken = await signToken({
      claims: {
        sub: 'test-user',
        iss: `${ISSUER}/`,
        token_use: 'access',
        scope: 'apha-integration-bridge-resource-srv/access',
        client_id: CLIENT_ID
      }
    })

    const res = await freshServer.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${slashToken}` }
    })

    expect(res.statusCode).toBe(401)
    expect(res.result.message).toBe('Authentication failed')
    expect(jwks.count).toBe(0)

    await freshServer.stop()
  })

  test('accepts a normal token when the configured issuer has a trailing slash', async () => {
    const previous = config.get('auth.allowedIssuers')
    try {
      // Operator configured the issuer with a trailing slash; it is normalised
      // at registration so a normal (no-slash) token still authenticates.
      config.set('auth.allowedIssuers', [`${ISSUER}/`])
      const freshServer = await buildSecureServer()

      const res = await freshServer.inject({
        method: 'GET',
        url: '/secure',
        headers: { authorization: `Bearer ${token}` }
      })

      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({
        message: 'auth required',
        user: 'test-user'
      })

      await freshServer.stop()
    } finally {
      config.set('auth.allowedIssuers', previous)
    }
  })

  test('refuses to start (throws at registration) when the allowlist is empty in a non-development environment', async () => {
    const previousIssuers = config.get('auth.allowedIssuers')
    const previousIsDev = config.get('isDevelopment')
    try {
      config.set('auth.allowedIssuers', [])
      config.set('isDevelopment', false)

      const s = Hapi.server()
      await expect(s.register({ plugin: authPlugin })).rejects.toThrow(
        /AUTH_ALLOWED_ISSUERS/
      )
    } finally {
      config.set('auth.allowedIssuers', previousIssuers)
      config.set('isDevelopment', previousIsDev)
    }
  })

  test('in development, an empty allowlist boots but rejects all tokens without fetching JWKS', async () => {
    const previousIssuers = config.get('auth.allowedIssuers')
    const previousIsDev = config.get('isDevelopment')
    try {
      config.set('auth.allowedIssuers', [])
      config.set('isDevelopment', true)

      const freshServer = await buildSecureServer()
      const jwks = countingJwks(ISSUER)

      const res = await freshServer.inject({
        method: 'GET',
        url: '/secure',
        headers: { authorization: `Bearer ${token}` }
      })

      expect(res.statusCode).toBe(401)
      expect(res.result.message).toBe('Authentication failed')
      expect(jwks.count).toBe(0)

      await freshServer.stop()
    } finally {
      config.set('auth.allowedIssuers', previousIssuers)
      config.set('isDevelopment', previousIsDev)
    }
  })

  test('fetches JWKS once and reuses it on subsequent requests', async () => {
    // Caching is now owned by jose's createRemoteJWKSet (cooldownDuration 30s /
    // cacheMaxAge 10min). A fresh server gives a cold resolver, so the first
    // request triggers exactly one fetch and the second is served from cache.
    const freshServer = await buildSecureServer()
    const jwks = countingJwks(ISSUER)

    const res1 = await freshServer.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${token}` }
    })

    expect(res1.statusCode).toBe(200)
    expect(jwks.count).toBe(1)

    const res2 = await freshServer.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${token}` }
    })

    expect(res2.statusCode).toBe(200)
    expect(jwks.count).toBe(1)

    await freshServer.stop()
  })
})

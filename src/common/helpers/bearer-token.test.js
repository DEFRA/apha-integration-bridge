import Hapi from '@hapi/hapi'
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals'
import { generateKeyPair, SignJWT } from 'jose'

import { bearerTokenPlugin } from './bearer-token.js'

// Constants
const ISSUER = 'https://mock-cognito'

describe('Bearer Token Plugin', () => {
  let server
  let token
  let privateKey

  beforeAll(async () => {
    // Generate key pair
    const keypair = await generateKeyPair('RS256')

    privateKey = keypair.privateKey

    // Generate valid token
    const now = Math.floor(Date.now() / 1000)

    token = await new SignJWT({
      sub: 'test-user',
      iss: ISSUER,
      token_use: 'access'
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'mock-key-id' })
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(privateKey)

    // Set up HAPI server
    server = Hapi.server()

    await server.register({ plugin: bearerTokenPlugin })

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
  })

  test('allows unauthenticated request to open route', async () => {
    const res = await server.inject({ method: 'GET', url: '/open' })

    expect(res.statusCode).toBe(200)

    expect(res.result).toEqual({ message: 'no auth required' })
  })

  test('rejects missing Authorization header on secure route', async () => {
    const res = await server.inject({ method: 'GET', url: '/secure' })

    expect(res.statusCode).toBe(401)

    expect(res.result.message).toMatch(
      /Missing or invalid Authorization header/
    )
  })

  test('rejects token with missing issuer', async () => {
    const now = Math.floor(Date.now() / 1000)

    const badToken = await new SignJWT({
      sub: 'test-user',
      token_use: 'access',
      scope: 'something-else'
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'mock-key-id' })
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(privateKey)

    const res = await server.inject({
      method: 'GET',
      url: '/secure',
      headers: { authorization: `Bearer ${badToken}` }
    })

    expect(res.statusCode).toBe(401)
    expect(res.result.message).toMatch(/missing.+iss.+claim/i)
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
})

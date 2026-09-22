import { describe, beforeAll, afterAll, test, expect } from '@jest/globals'
import { SignJWT, generateKeyPair, generateSecret, exportJWK } from 'jose'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

import { getUserEmail } from './user-context.js'

const ISSUER = 'https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_TEST'
const UNTRUSTED_ISSUER =
  'https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_EVIL'
const JWKS_PATH = '/.well-known/jwks.json'
const TEST_EMAIL = 'case.worker@example.com'

const msw = setupServer()

/**
 * @param {string | undefined} forwardedAuth Value for the
 * X-Forwarded-Authorization header (undefined = header absent)
 */
const requestWithForwardedAuth = (forwardedAuth) => ({
  headers:
    forwardedAuth === undefined
      ? {}
      : { 'x-forwarded-authorization': forwardedAuth }
})

describe('getUserEmail (X-Forwarded-Authorization verification)', () => {
  let privateKey
  let attackerPrivateKey
  let publicJwk

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
    const keypair = await generateKeyPair('RS256')
    privateKey = keypair.privateKey

    const attackerKeypair = await generateKeyPair('RS256')
    attackerPrivateKey = attackerKeypair.privateKey

    publicJwk = await exportJWK(keypair.publicKey)
    publicJwk.kid = 'mock-key-id'
    publicJwk.use = 'sig'
    publicJwk.alg = 'RS256'

    // AUTH_ALLOWED_ISSUERS is provided globally by .jest/setup-files.js and
    // matches ISSUER above.
    msw.use(
      http.get(`${ISSUER}${JWKS_PATH}`, () => {
        return HttpResponse.json({ keys: [publicJwk] })
      })
    )

    msw.listen({ onUnhandledRequest: 'bypass' })
  })

  afterAll(() => {
    msw.close()
  })

  test('returns the email from a valid signed forwarded token', async () => {
    const token = await signToken({
      claims: { iss: ISSUER, email: TEST_EMAIL }
    })

    await expect(
      getUserEmail(requestWithForwardedAuth(`Bearer ${token}`))
    ).resolves.toBe(TEST_EMAIL)
  })

  test('accepts a valid token without the Bearer prefix', async () => {
    const token = await signToken({
      claims: { iss: ISSUER, email: TEST_EMAIL }
    })

    await expect(getUserEmail(requestWithForwardedAuth(token))).resolves.toBe(
      TEST_EMAIL
    )
  })

  test('returns null when the header is missing', async () => {
    await expect(
      getUserEmail(requestWithForwardedAuth(undefined))
    ).resolves.toBe(null)
  })

  test('rejects a hand-made token signed with an unknown key', async () => {
    // Attacker mints their own RS256 JWT with any email inside — the exact
    // attack this verification exists to stop. No secret needed to create it,
    // but it must not verify against the trusted JWKS.
    const forgedToken = await signToken({
      claims: { iss: ISSUER, email: 'someone.else@example.com' },
      header: { alg: 'RS256', kid: 'attacker-key-id' },
      key: attackerPrivateKey
    })

    await expect(
      getUserEmail(requestWithForwardedAuth(`Bearer ${forgedToken}`))
    ).resolves.toBe(null)
  })

  test('rejects a token signed with a disallowed algorithm (HS256)', async () => {
    const secret = await generateSecret('HS256')
    const hsToken = await signToken({
      claims: { iss: ISSUER, email: TEST_EMAIL },
      header: { alg: 'HS256' },
      key: secret
    })

    await expect(
      getUserEmail(requestWithForwardedAuth(`Bearer ${hsToken}`))
    ).resolves.toBe(null)
  })

  test('rejects an expired token', async () => {
    const expiredToken = await signToken({
      claims: { iss: ISSUER, email: TEST_EMAIL },
      expiresInSeconds: -60
    })

    await expect(
      getUserEmail(requestWithForwardedAuth(`Bearer ${expiredToken}`))
    ).resolves.toBe(null)
  })

  test('rejects a token from an untrusted issuer without fetching its JWKS', async () => {
    const evilJwks = countingJwks(UNTRUSTED_ISSUER)

    const untrustedToken = await signToken({
      claims: { iss: UNTRUSTED_ISSUER, email: TEST_EMAIL }
    })

    await expect(
      getUserEmail(requestWithForwardedAuth(`Bearer ${untrustedToken}`))
    ).resolves.toBe(null)
    expect(evilJwks.count).toBe(0)
  })

  test('rejects a token with no email claim', async () => {
    const noEmailToken = await signToken({
      claims: { iss: ISSUER, sub: 'user-without-email' }
    })

    await expect(
      getUserEmail(requestWithForwardedAuth(`Bearer ${noEmailToken}`))
    ).resolves.toBe(null)
  })

  test('rejects a structurally malformed token', async () => {
    await expect(
      getUserEmail(requestWithForwardedAuth('Bearer not-a-jwt'))
    ).resolves.toBe(null)
  })

  test('rejects a token whose iss has a trailing-slash variant', async () => {
    const slashToken = await signToken({
      claims: { iss: `${ISSUER}/`, email: TEST_EMAIL }
    })

    await expect(
      getUserEmail(requestWithForwardedAuth(`Bearer ${slashToken}`))
    ).resolves.toBe(null)
  })
})

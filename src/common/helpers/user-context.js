import { jwtVerify, createRemoteJWKSet, customFetch, decodeJwt } from 'jose'
import { config } from '../../config.js'
import { createLogger } from './logging/logger.js'
import { proxyFetch } from './proxy/proxy-fetch.js'

const logger = createLogger()

/**
 * Default timeout for JWKS fetch operations (in milliseconds)
 */
const JWKS_FETCH_TIMEOUT_MS = 20_000

/**
 * Remote JWKS resolvers for forwarded-token verification, keyed by the exact
 * issuer string. Resolvers are created lazily per trusted issuer so the first
 * request pays for setup, not module load. Each resolver owns its own
 * key caching, cooldown and rotation handling.
 *
 * @type {Map<string, ReturnType<typeof createRemoteJWKSet>>}
 */
const jwksByIssuer = new Map()

/**
 * Trusted token issuers for the forwarded user identity. Derived solely from
 * the configured allowlist — never from the token's own `iss` claim.
 * Trailing slashes are stripped so an operator typo doesn't silently reject
 * every valid token; empty entries are dropped.
 *
 * @returns {string[]}
 */
function getAllowedIssuers() {
  const allowedIssuers = []

  for (const issuer of config.get('auth.allowedIssuers')) {
    if (issuer && typeof issuer === 'string') {
      allowedIssuers.push(issuer.replace(/\/+$/, ''))
    }
  }

  return allowedIssuers
}

/**
 * Get (creating on first use) the JWKS resolver for a trusted issuer.
 *
 * @param {string} issuer Exact issuer string from the verified allowlist
 * @returns {ReturnType<typeof createRemoteJWKSet> | null}
 */
function getJwksForIssuer(issuer) {
  const cached = jwksByIssuer.get(issuer)

  if (cached) {
    return cached
  }

  let jwksUrl

  try {
    jwksUrl = new URL(`${issuer}/.well-known/jwks.json`)
  } catch {
    logger.warn(
      'Failed to verify X-Forwarded-Authorization JWT: invalid issuer URL'
    )
    return null
  }

  const jwks = createRemoteJWKSet(jwksUrl, {
    [customFetch]: proxyFetch,
    timeoutDuration: JWKS_FETCH_TIMEOUT_MS
  })

  jwksByIssuer.set(issuer, jwks)

  return jwks
}

/**
 * Extracts the user email from the X-Forwarded-Authorization header after
 * fully verifying the JWT: untrusted issuers are rejected before any key
 * fetch, then the signature, expiry and issuer are verified against the
 * trusted JWKS (RS256 only). Never decodes and trusts.
 *
 * This is used for user-context aware endpoints.
 * @param {import('@hapi/hapi').Request} request
 * @returns {Promise<string | null>} User email or null if missing/invalid
 */
export async function getUserEmail(request) {
  const forwardedAuth = request.headers['x-forwarded-authorization']

  if (!forwardedAuth) {
    return null
  }

  try {
    // Node's http layer joins repeated headers into a single string, so a
    // string[] here is unreachable in practice — assert rather than branch.
    const token = /** @type {string} */ (forwardedAuth)
      .replace(/^Bearer\s+/i, '')
      .trim()

    if (!token) {
      logger.warn('Empty token in X-Forwarded-Authorization header')
      return null
    }

    let issuer

    try {
      ;({ iss: issuer } = decodeJwt(token))
    } catch {
      logger.warn('Malformed JWT in X-Forwarded-Authorization header')
      return null
    }

    if (!issuer || typeof issuer !== 'string') {
      logger.warn('Missing issuer claim in X-Forwarded-Authorization JWT')
      return null
    }

    // Reject any token whose issuer is not in the allowlist before any JWKS
    // fetch or signature verification. The match is exact: a trailing-slash
    // variant of a trusted issuer fails closed.
    if (!getAllowedIssuers().includes(issuer)) {
      logger.warn('Untrusted issuer in X-Forwarded-Authorization JWT')
      return null
    }

    const jwks = getJwksForIssuer(issuer)

    if (!jwks) {
      return null
    }

    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      algorithms: ['RS256']
    })

    const email = payload.email

    if (!email || typeof email !== 'string') {
      logger.warn('No email claim found in X-Forwarded-Authorization JWT')
      return null
    }

    return email
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    const errorCode = 'code' in err ? err.code : undefined

    if (errorCode === 'ERR_JWT_EXPIRED') {
      logger.warn('Expired JWT in X-Forwarded-Authorization header')
    } else if (errorCode === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      logger.warn(
        'Invalid signature in X-Forwarded-Authorization JWT (hand-made or wrong key)'
      )
    } else {
      logger.warn({ err }, 'Failed to verify X-Forwarded-Authorization JWT')
    }

    return null
  }
}

import { jwtVerify, createRemoteJWKSet, customFetch, decodeJwt } from 'jose'
import Boom from '@hapi/boom'
import { config } from '../../config.js'
import { metricsCounter } from './metrics.js'
import { createLogger } from './logging/logger.js'
import { proxyFetch } from './proxy/proxy-fetch.js'

const logger = createLogger()

/**
 * @typedef {import('../../types/api.js').Server} Server
 * @typedef {import('../../types/api.js').Request} Request
 * @typedef {import('../../types/api.js').ResponseToolkit} ResponseToolkit
 */

/**
 * Creates a Hapi.js plugin for JWT authentication with signature verification.
 * @returns {Object} a Hapi.js plugin for authentication
 */
export const authPlugin = {
  plugin: {
    name: 'authPlugin',
    version: '0.0.0',
    /**
     * Registers the plugin with the Hapi server.
     *
     * @param {Server} server - The Hapi.js server instance.
     */
    register: async (server) => {
      const expectedScope = config.get('auth.scope')

      /**
       * alowlist of trusted token issuers. The JWKS used to verify a token is
       * derived solely from these configured values — never from the token's own
       * `iss` claim — which closes the auth-bypass where an attacker-chosen issuer
       * selected the key source. Trailing slashes are stripped so an operator
       * typo doesn't silently reject every valid token; empty entries are dropped.
       */
      // const issuers = config.get('auth.allowedIssuers')

      /**
       * @type {string[]}
       */
      const allowedIssuers = []

      for (const issuer of config.get('auth.allowedIssuers')) {
        if (issuer && typeof issuer === 'string') {
          allowedIssuers.push(issuer.replace(/\/+$/, ''))
        }
      }

      if (allowedIssuers.length === 0) {
        const message =
          'Set AUTH_ALLOWED_ISSUERS to the trusted Cognito issuer URL(s).'

        // Fail loud in deployed environments (refuse to start) so a misconfigured
        // deploy is visible rather than silently rejecting all traffic. In local
        // development, log and fall through to reject every token at request time.
        if (config.get('isDevelopment')) {
          logger?.error(`${message} All tokens will be rejected.`)
        } else {
          throw new Error(message)
        }
      }

      /**
       * 1 remote JWKS resolver per trusted issuer, keyed by the exact issuer
       * string. createRemoteJWKSet is lazy (no network here) and owns its own
       * caching, cooldown and key-rotation handling. The JWKS fetch is routed
       * through proxyFetch so the egress proxy is still used in deployed
       * environments.
       */
      const jwksByIssuer = new Map(
        allowedIssuers.map((issuer) => {
          let jwksUrl
          try {
            jwksUrl = new URL(`${issuer}/.well-known/jwks.json`)
          } catch {
            throw new Error(
              `authPlugin: invalid issuer URL in AUTH_ALLOWED_ISSUERS: "${issuer}"`
            )
          }
          return [
            issuer,
            createRemoteJWKSet(jwksUrl, { [customFetch]: proxyFetch })
          ]
        })
      )

      server.auth.scheme('bearer', () => {
        return {
          authenticate: async (request, h) => {
            const authHeader = request.raw.req.headers.authorization

            if (!authHeader?.startsWith('Bearer ')) {
              logger?.warn(
                'Authentication failed: Missing or invalid Authorization header'
              )

              return Boom.unauthorized('Authentication failed')
            }

            const token = authHeader.slice('Bearer '.length)

            try {
              /**
               * decode the JWT payload WITHOUT verifying it, only to read the
               * issuer. The issuer is used purely to select a pre-configured JWKS
               * resolver; it can never introduce a new JWKS URL. A malformed token
               * makes decodeJwt throw, which the catch below maps to a 401.
               */
              const { iss: issuer } = decodeJwt(token)

              if (!issuer) {
                logger?.warn(
                  'Authentication failed: Missing issuer claim in token'
                )

                return Boom.unauthorized('Authentication failed')
              }

              const JWKs = jwksByIssuer.get(issuer)

              // reject any token whose issuer is not in the allowlist before any
              // JWKs fetch or signature verification.
              if (!JWKs) {
                logger?.warn('Authentication failed: Untrusted token issuer')

                return Boom.unauthorized('Authentication failed')
              }

              const { payload } = await jwtVerify(token, JWKs, {
                issuer,
                algorithms: ['RS256']
              })

              if (payload.token_use !== 'access') {
                logger?.warn(
                  'Authentication failed: Token is not an access token'
                )

                return Boom.unauthorized('Authentication failed')
              }

              if (!payload.client_id || typeof payload.client_id !== 'string') {
                logger?.warn('Authentication failed: Missing client_id claim')

                return Boom.unauthorized('Authentication failed')
              }

              /**
               * @type {string[]}
               */
              let grantedScopes = []

              if (typeof payload.scope === 'string') {
                // cognito returns granted scopes as a space-delimited string
                // (RFC 6749 §3.3). Split on whitespace and check membership so
                // that clients granted additional scopes are not rejected.
                grantedScopes = payload.scope.split(/\s+/).filter(Boolean)
              }

              if (!grantedScopes.includes(expectedScope)) {
                logger?.warn(
                  'Authorization failed: Required scope not present in token'
                )

                return Boom.forbidden('Insufficient permissions')
              }

              logger?.info('Token validated successfully')

              await metricsCounter('clientRequest', 1, {
                client_id: payload.client_id
              })

              return h.authenticated({
                credentials: { token },
                artifacts: payload
              })
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err))

              const errorCode = 'code' in error ? error.code : undefined

              // Provide specific error messages based on error type
              if (errorCode === 'ERR_JWT_EXPIRED') {
                logger?.warn('Authentication failed: Token has expired')

                return Boom.unauthorized('Token has expired')
              }

              if (errorCode === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
                logger?.warn(
                  'Authentication failed: Token signature verification failed'
                )
                return Boom.unauthorized('Authentication failed')
              }

              if (errorCode === 'ERR_JOSE_ALG_NOT_ALLOWED') {
                logger?.warn(
                  'Authentication failed: Disallowed token signing algorithm'
                )
                return Boom.unauthorized('Authentication failed')
              }

              if (errorCode === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
                logger?.warn(
                  'Authentication failed: Token claim validation failed'
                )
                return Boom.unauthorized('Authentication failed')
              }

              if (errorCode === 'ERR_JWKS_NO_MATCHING_KEY') {
                logger?.warn(
                  'Authentication failed: No matching key found in JWKS'
                )
                return Boom.unauthorized('Authentication failed')
              }

              if (errorCode === 'ERR_JWKS_TIMEOUT') {
                // infrastructure failure (JWKS endpoint or egress proxy
                // unreachable), not a bad token — logged distinctly so a valid
                // token rejected for this reason is diagnosable. Status is kept
                // at 401 to preserve prior behaviour.
                logger?.error(
                  'Authentication failed: Timed out fetching JWKS from issuer'
                )
                return Boom.unauthorized('Authentication failed')
              }

              logger?.warn('Authentication failed: Invalid or malformed token')

              return Boom.unauthorized('Authentication failed')
            }
          }
        }
      })

      server.auth.strategy('jwt-auth', 'bearer', {})

      server.auth.default('jwt-auth')
    }
  }
}

import { createRemoteJWKSet, jwtVerify } from 'jose'
import Boom from '@hapi/boom'
import { config } from '../../config.js'
import { metricsCounter } from './metrics.js'
import { createLogger } from './logging/logger.js'
import { proxyFetch } from './proxy/proxy-fetch.js'

const expectedScope = config.get('auth.scope')
const logger = createLogger()

/**
 * @typedef {import('@hapi/hapi').Server} Server
 * @typedef {import('@hapi/hapi').Request} Request
 * @typedef {import('@hapi/hapi').ResponseToolkit} ResponseToolkit
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
      server.auth.scheme('bearer', () => {
        return {
          authenticate: async (request, h) => {
            // Debug log: Request received
            logger?.info(
              `AUTH PLUGIN: Authentication request received - ${request.method} ${request.path} - Auth header present: ${!!request.raw.req.headers.authorization}`
            )

            const authHeader = request.raw.req.headers.authorization

            if (!authHeader?.startsWith('Bearer ')) {
              logger?.warn(
                `AUTH PLUGIN: Missing or invalid Authorization header - ${request.method} ${request.path} - Header: ${authHeader ? 'present but invalid format' : 'missing'}`
              )
              return Boom.unauthorized(
                'Missing or invalid Authorization header. Please provide a valid Bearer token.'
              )
            }

            const token = authHeader.slice('Bearer '.length)

            // Debug log: Token extracted
            logger?.info(
              `AUTH PLUGIN: Bearer token extracted - ${request.path} - Token length: ${token.length}`
            )

            try {
              /**
               * Decode the JWT payload to extract the issuer
               * We need the issuer to construct the JWKS endpoint URL
               */
              const decoded = JSON.parse(
                Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
              )

              const issuer = decoded.iss

              // Debug log: Token decoded
              logger?.info(
                `AUTH PLUGIN: Token decoded - ${request.path} - Issuer: ${issuer} - Client: ${decoded.client_id} - Scope: ${decoded.scope} - Token use: ${decoded.token_use}`
              )

              if (!issuer) {
                logger?.warn(
                  `AUTH PLUGIN: Missing issuer claim in token - ${request.method} ${request.path}`
                )
                return Boom.unauthorized(
                  'Invalid token: Missing issuer (iss) claim'
                )
              }

              const jwksUrl = `${issuer}/.well-known/jwks.json`

              // Debug log: About to fetch JWKS
              logger?.info(
                `AUTH PLUGIN: Attempting to fetch JWKS - ${request.path} - URL: ${jwksUrl}`
              )

              let JWKS
              try {
                JWKS = createRemoteJWKSet(new URL(jwksUrl), {
                  [Symbol.for('undici.fetch')]: proxyFetch
                })
                logger?.info(
                  `AUTH PLUGIN: JWKS client created successfully with proxyFetch - ${request.path}`
                )
              } catch (jwksError) {
                const jwksErrMsg =
                  jwksError instanceof Error
                    ? jwksError.message
                    : String(jwksError)
                logger?.error(
                  `AUTH PLUGIN: Failed to create JWKS client - ${request.path} - Error: ${jwksErrMsg}`
                )
                throw jwksError
              }

              logger?.info(
                `AUTH PLUGIN: Starting JWT signature verification - ${request.path}`
              )

              const { payload } = await jwtVerify(token, JWKS, {
                issuer,
                audience: undefined
              })

              // Debug log: Signature verified!
              logger?.info(
                `AUTH PLUGIN: JWT signature verified successfully! - ${request.path} - Client: ${payload.client_id}`
              )

              if (payload.token_use !== 'access') {
                logger?.warn(
                  `AUTH PLUGIN: Token is not an access token - ${request.method} ${request.path} - Token use: ${payload.token_use}`
                )
                return Boom.unauthorized(
                  'Invalid token: Token is not an access token'
                )
              }

              if (!payload.client_id || typeof payload.client_id !== 'string') {
                logger?.warn(
                  `AUTH PLUGIN: Missing client_id claim - ${request.method} ${request.path}`
                )
                return Boom.unauthorized(
                  'Invalid token: Missing client_id claim'
                )
              }

              if (payload.scope !== expectedScope) {
                logger?.warn(
                  `AUTH PLUGIN: Token scope not authorized - ${request.method} ${request.path} - Client: ${payload.client_id} - Expected: ${expectedScope} - Actual: ${payload.scope}`
                )
                return Boom.forbidden(
                  `Insufficient permissions: Required scope '${expectedScope}' not present in token`
                )
              }

              logger?.info(
                `AUTH PLUGIN: Token validated successfully - ${request.method} ${request.path} - Client: ${payload.client_id} - Issuer: ${payload.iss}`
              )

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
              const errorCause = 'cause' in error ? error.cause : undefined

              logger?.error(
                `AUTH PLUGIN: Token verification failed - ${request.method} ${request.path} - Error: ${error.message} - Code: ${errorCode || 'none'} - Cause: ${errorCause ? JSON.stringify(errorCause) : 'none'} - Stack: ${error.stack?.substring(0, 500)}`
              )

              // Provide specific error messages based on error type
              if (errorCode === 'ERR_JWT_EXPIRED') {
                return Boom.unauthorized('Token has expired')
              }
              if (errorCode === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
                return Boom.unauthorized(
                  'Token signature verification failed: Token has not been signed by Amazon Cognito'
                )
              }
              if (errorCode === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
                return Boom.unauthorized('Token claim validation failed')
              }
              if (errorCode === 'ERR_JWKS_NO_MATCHING_KEY') {
                return Boom.unauthorized(
                  'Token signature verification failed: No matching key found in JWKS'
                )
              }

              return Boom.unauthorized(
                'Token verification failed: Invalid or malformed token'
              )
            }
          }
        }
      })

      server.auth.strategy('jwt-auth', 'bearer', {})

      server.auth.default('jwt-auth')

      logger?.info(
        'AUTH PLUGIN: JWT authentication strategy registered as default'
      )
    }
  }
}

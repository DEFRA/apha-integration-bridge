import { createRemoteJWKSet, jwtVerify } from 'jose'
import Boom from '@hapi/boom'
import { config } from '../../config.js'
import { metricsCounter } from './metrics.js'
import { createLogger } from './logging/logger.js'

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
            logger?.info({
              msg: 'AUTH PLUGIN: Authentication request received',
              path: request.path,
              method: request.method,
              hasAuthHeader: !!request.raw.req.headers.authorization
            })

            const authHeader = request.raw.req.headers.authorization

            if (!authHeader?.startsWith('Bearer ')) {
              logger?.warn({
                msg: 'AUTH PLUGIN: Missing or invalid Authorization header',
                path: request.path,
                method: request.method,
                authHeaderValue: authHeader
                  ? 'present but invalid format'
                  : 'missing'
              })
              return Boom.unauthorized(
                'Missing or invalid Authorization header. Please provide a valid Bearer token.'
              )
            }

            const token = authHeader.slice('Bearer '.length)

            // Debug log: Token extracted
            logger?.info({
              msg: 'AUTH PLUGIN: Bearer token extracted, starting validation',
              path: request.path,
              tokenLength: token.length
            })

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
              logger?.info({
                msg: 'AUTH PLUGIN: Token decoded successfully',
                path: request.path,
                issuer,
                client_id: decoded.client_id,
                scope: decoded.scope,
                token_use: decoded.token_use
              })

              if (!issuer) {
                logger?.warn({
                  msg: 'AUTH PLUGIN: Missing issuer claim in token',
                  path: request.path,
                  method: request.method
                })
                return Boom.unauthorized(
                  'Invalid token: Missing issuer (iss) claim'
                )
              }

              const jwksUrl = `${issuer}/.well-known/jwks.json`

              // Debug log: About to fetch JWKS
              logger?.info({
                msg: 'AUTH PLUGIN: Attempting to fetch JWKS for signature verification',
                path: request.path,
                jwksUrl
              })

              const JWKS = createRemoteJWKSet(new URL(jwksUrl))

              logger?.info({
                msg: 'AUTH PLUGIN: JWKS client created, now verifying JWT signature',
                path: request.path
              })

              const { payload } = await jwtVerify(token, JWKS, {
                issuer,
                audience: undefined
              })

              // Debug log: Signature verified!
              logger?.info({
                msg: 'AUTH PLUGIN: JWT signature verified successfully!',
                path: request.path,
                client_id: payload.client_id
              })

              if (payload.token_use !== 'access') {
                logger?.warn({
                  msg: 'Authentication failed: Token is not an access token',
                  path: request.path,
                  method: request.method,
                  token_use: payload.token_use
                })
                return Boom.unauthorized(
                  'Invalid token: Token is not an access token'
                )
              }

              if (!payload.client_id || typeof payload.client_id !== 'string') {
                logger?.warn({
                  msg: 'Authentication failed: Missing client_id claim',
                  path: request.path,
                  method: request.method
                })
                return Boom.unauthorized(
                  'Invalid token: Missing client_id claim'
                )
              }

              if (payload.scope !== expectedScope) {
                logger?.warn({
                  msg: 'Authorization failed: Token scope not authorized',
                  path: request.path,
                  method: request.method,
                  client_id: payload.client_id,
                  expected_scope: expectedScope,
                  actual_scope: payload.scope
                })
                return Boom.forbidden(
                  `Insufficient permissions: Required scope '${expectedScope}' not present in token`
                )
              }

              logger?.info({
                msg: 'Token validated successfully with signature verification',
                path: request.path,
                method: request.method,
                client_id: payload.client_id,
                issuer: payload.iss
              })

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

              logger?.warn({
                msg: 'Authentication failed: Token verification failed',
                path: request.path,
                method: request.method,
                error: error.message,
                code: errorCode
              })

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

      server.auth.strategy('simple', 'bearer', {})

      server.auth.default('simple')
    }
  }
}

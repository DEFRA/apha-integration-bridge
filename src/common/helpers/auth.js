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
 * Creates a Hapi.js plugin for authenticating JWT using a remote JWK set.
 *
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
            const authHeader = request.raw.req.headers.authorization

            if (!authHeader?.startsWith('Bearer ')) {
              logger?.warn({
                msg: 'Authentication failed: Missing or invalid Authorization header',
                path: request.path,
                method: request.method
              })
              return Boom.unauthorized(
                'Missing or invalid Authorization header. Please provide a valid Bearer token.'
              )
            }

            const token = authHeader.slice('Bearer '.length)

            try {
              /**
               * Decode just the payload to extract `iss`
               */
              const decoded = JSON.parse(
                Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
              )

              const issuer = decoded.iss

              if (!issuer) {
                logger?.warn({
                  msg: 'Authentication failed: Missing issuer claim in token',
                  path: request.path,
                  method: request.method
                })
                return Boom.unauthorized(
                  'Invalid token: Missing issuer (iss) claim'
                )
              }

              const JWKS = createRemoteJWKSet(
                new URL(`${issuer}/.well-known/jwks.json`)
              )

              const { payload } = await jwtVerify(token, JWKS, {
                issuer,
                audience: undefined
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

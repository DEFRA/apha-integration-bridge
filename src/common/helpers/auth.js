import { jwtVerify, createLocalJWKSet } from 'jose'
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
            const authHeader = request.raw.req.headers.authorization

            if (!authHeader?.startsWith('Bearer ')) {
              logger?.warn(
                'Authentication failed: Missing or invalid Authorization header'
              )
              return Boom.unauthorized(
                'Missing or invalid Authorization header. Please provide a valid Bearer token.'
              )
            }

            const token = authHeader.slice('Bearer '.length)

            try {
              /**
               * Decode the JWT payload to extract the issuer
               * We need the issuer to construct the JWKS endpoint URL
               */
              const decoded = JSON.parse(
                Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
              )

              const issuer = decoded.iss

              if (!issuer) {
                logger?.warn(
                  'Authentication failed: Missing issuer claim in token'
                )
                return Boom.unauthorized(
                  'Invalid token: Missing issuer (iss) claim'
                )
              }

              const jwksUrl = `${issuer}/.well-known/jwks.json`

              // Fetch JWKS using proxyFetch to ensure proxy is used
              const jwksResponse = await proxyFetch(jwksUrl)

              if (!jwksResponse.ok) {
                logger?.error('Failed to fetch JWKS from Cognito')
                throw new Error(
                  `Failed to fetch JWKS: ${jwksResponse.status} ${jwksResponse.statusText}`
                )
              }

              const jwks = await jwksResponse.json()

              // Create local JWKS for verification
              const JWKS = createLocalJWKSet(jwks)

              const { payload } = await jwtVerify(token, JWKS, {
                issuer,
                audience: undefined
              })

              if (payload.token_use !== 'access') {
                logger?.warn(
                  'Authentication failed: Token is not an access token'
                )
                return Boom.unauthorized(
                  'Invalid token: Token is not an access token'
                )
              }

              if (!payload.client_id || typeof payload.client_id !== 'string') {
                logger?.warn('Authentication failed: Missing client_id claim')
                return Boom.unauthorized(
                  'Invalid token: Missing client_id claim'
                )
              }

              if (payload.scope !== expectedScope) {
                logger?.warn(
                  'Authorization failed: Required scope not present in token'
                )
                return Boom.forbidden(
                  `Insufficient permissions: Required scope '${expectedScope}' not present in token`
                )
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
                return Boom.unauthorized(
                  'Token signature verification failed: Token has not been signed by Amazon Cognito'
                )
              }
              if (errorCode === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
                logger?.warn(
                  'Authentication failed: Token claim validation failed'
                )
                return Boom.unauthorized('Token claim validation failed')
              }
              if (errorCode === 'ERR_JWKS_NO_MATCHING_KEY') {
                logger?.warn(
                  'Authentication failed: No matching key found in JWKS'
                )
                return Boom.unauthorized(
                  'Token signature verification failed: No matching key found in JWKS'
                )
              }

              logger?.warn('Authentication failed: Invalid or malformed token')
              return Boom.unauthorized(
                'Token verification failed: Invalid or malformed token'
              )
            }
          }
        }
      })

      server.auth.strategy('jwt-auth', 'bearer', {})

      server.auth.default('jwt-auth')
    }
  }
}

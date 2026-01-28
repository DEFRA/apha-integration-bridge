import { createLocalJWKSet, jwtVerify } from 'jose'
import Boom from '@hapi/boom'
import { config } from '../../config.js'
import { fetch, ProxyAgent } from 'undici'

const expectedScope = config.get('auth.scope')

const httpProxy = config.get('httpProxy')

/**
 * @typedef {import('@hapi/hapi').Server} Server
 * @typedef {import('@hapi/hapi').Request} Request
 * @typedef {import('@hapi/hapi').ResponseToolkit} ResponseToolkit
 */

const getJWKSetResponse = async (url, options = {}) => {
  if (httpProxy) {
    return fetch(url, {
      ...options,
      dispatcher: new ProxyAgent({
        uri: httpProxy
      })
    })
  }

  return fetch(url, options)
}

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
              return Boom.unauthorized(
                'Missing or invalid Authorization header'
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
                return Boom.unauthorized('Missing `iss` claim in token')
              }

              const jwkSet = await getJWKSetResponse(
                new URL(`${issuer}/.well-known/jwks.json`)
              )

              /**
               * @type {any}
               */
              const json = await jwkSet.json()

              const JWKS = createLocalJWKSet(json)

              const { payload } = await jwtVerify(token, JWKS, {
                issuer,
                audience: undefined
              })

              if (payload.token_use !== 'access') {
                return Boom.unauthorized('Token is not an access token')
              }

              if (payload.scope !== expectedScope) {
                return Boom.forbidden('Token scope is not authorized')
              }

              return h.authenticated({
                credentials: { token },
                artifacts: payload
              })
            } catch (err) {
              if (Boom.isBoom(err)) {
                return err
              }

              return Boom.unauthorized('Token verification failed')
            }
          }
        }
      })

      server.auth.strategy('simple', 'bearer', {})

      server.auth.default('simple')
    }
  }
}

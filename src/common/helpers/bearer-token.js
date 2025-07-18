import Boom from '@hapi/boom'

/**
 * @typedef {import('@hapi/hapi').Server} Server
 * @typedef {import('@hapi/hapi').Request} Request
 * @typedef {import('@hapi/hapi').ResponseToolkit} ResponseToolkit
 */

/**
 * Creates a Hapi.js plugin for determining if a request has a bearer token
 *
 * @note IMPORTANT: This plugin does not verify the token, it only checks if a bearer token is present.
 *
 * @returns {Object} a Hapi.js plugin for authentication
 */
export const bearerTokenPlugin = {
  plugin: {
    name: 'bearerTokenPlugin',
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

              return h.authenticated({
                credentials: { token },
                artifacts: decoded
              })
            } catch (err) {
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

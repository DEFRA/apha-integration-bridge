import Boom from '@hapi/boom'

/**
 * Registers a simple authentication strategy on a Hapi server for route tests.
 * @param {import('@hapi/hapi').Server} server - The Hapi server used in the test.
 */
export const registerSimpleAuthStrategy = (server) => {
  server.auth.scheme('simple', () => {
    return {
      authenticate: (request, h) => h.authenticated({ credentials: {} })
    }
  })

  server.auth.strategy('simple', 'simple', {})
  server.auth.default('simple')
}

/**
 * Registers a bearer token authentication strategy for route tests.
 * @param {import('@hapi/hapi').Server} server - The Hapi server used in the test.
 */
export const registerBearerAuthStrategy = (server) => {
  server.auth.scheme('bearer', () => {
    return {
      authenticate: async (request, h) => {
        const authHeader = request.raw.req.headers.authorization

        if (!authHeader?.startsWith('Bearer ')) {
          return Boom.unauthorized('Missing or invalid Authorization header')
        }

        const token = authHeader.slice('Bearer '.length)

        try {
          const decoded = JSON.parse(
            Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
          )

          const issuer = decoded.iss

          if (!issuer) {
            return Boom.unauthorized('Missing `iss` claim in token')
          }

          if (!decoded.client_id) {
            return Boom.unauthorized('Missing `client_id` claim in token')
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

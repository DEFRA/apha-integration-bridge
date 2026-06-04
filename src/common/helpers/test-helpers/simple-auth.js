/**
 * Registers a simple authentication strategy on a Hapi server for route tests.
 *
 * @param {import('@hapi/hapi').Server} server - The Hapi server used in the test.
 * @param {Object} [options] - Optional configuration.
 * @param {string} [options.clientId] - Client ID to use in auth artifacts (for PII masking tests). If not provided, artifacts will be empty.
 */
export const registerSimpleAuthStrategy = (server, options = {}) => {
  const { clientId } = options

  server.auth.scheme('simple', () => {
    return {
      authenticate: (_request, h) => {
        const artifacts = clientId ? { client_id: clientId } : {}
        return h.authenticated({ credentials: {}, artifacts })
      }
    }
  })

  server.auth.strategy('simple', 'simple', {})
  server.auth.default('simple')
}

/**
 * Registers a simple authentication strategy on a Hapi server for route tests.
 *
 * @param {import('@hapi/hapi').Server} server - The Hapi server used in the test.
 * @param {Object} [options] - Optional configuration.
 * @param {string} [options.clientId] - Client ID to use in auth artifacts (for PII masking tests). If not provided, artifacts will be empty.
 * @param {(request: import('@hapi/hapi').Request) => string | string[] | undefined} [options.getClientId] - Function to extract client ID from request (for concurrent masking tests).
 */
export const registerSimpleAuthStrategy = (server, options = {}) => {
  const { clientId, getClientId } = options

  server.auth.scheme('simple', () => {
    return {
      authenticate: (request, h) => {
        let extractedClientId = clientId
        if (getClientId) {
          const result = getClientId(request)
          extractedClientId = Array.isArray(result) ? result[0] : result
        }

        const artifacts = extractedClientId
          ? { client_id: extractedClientId }
          : {}
        return h.authenticated({ credentials: {}, artifacts })
      }
    }
  })

  server.auth.strategy('simple', 'simple', {})
  server.auth.default('simple')
}

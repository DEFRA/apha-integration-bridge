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

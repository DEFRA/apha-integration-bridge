/**
 * Decoded JWT artifacts attached to the request by `authPlugin`. The auth
 * plugin enforces that `client_id` is a non-empty string before the request
 * reaches any extension, so consumers may treat it as guaranteed once auth
 * has run. `client_id` is marked optional only because `auth: false` routes
 * never populate artifacts.
 *
 * @typedef {Object} JwtArtifacts
 * @property {string} [client_id]
 *
 * @typedef {import('@hapi/hapi').Request & {
 *   app: { scopes?: string[] },
 *   auth: { artifacts: JwtArtifacts }
 * }} HapiRequestWithScopes
 *
 * @typedef {Object} ClientScopesOptions
 * @property {import('../../lib/clients/load.js').ClientsConfig} clients
 */

/**
 * Returns the union of scopes granted to `clientId` across every matching
 * entry in the clients config. Returns `[]` when the client is not present.
 *
 * @param {string | null | undefined} clientId
 * @param {import('../../lib/clients/load.js').ClientsConfig} clients
 * @returns {string[]}
 */
export const findScopesForClient = (clientId, clients) => {
  if (!clientId) {
    return []
  }

  const merged = new Set()

  for (const entry of Object.values(clients)) {
    if (entry.client_ids.includes(clientId)) {
      for (const scope of entry.scopes) {
        merged.add(scope)
      }
    }
  }

  return Array.from(merged)
}

/**
 * Hapi plugin that populates `request.app.scopes` with the scopes granted to
 * the authenticated client. Downstream extensions (PII masking, future
 * permission checks) read this array to gate their behaviour.
 *
 * Fail-closed: any request whose `client_id` is missing or unrecognised will
 * have `request.app.scopes = []`.
 */
export const clientScopesPlugin = {
  plugin: {
    name: 'clientScopesPlugin',
    version: '0.0.0',
    /**
     * @param {import('@hapi/hapi').Server} server
     * @param {ClientScopesOptions} options
     */
    register: (server, options) => {
      const { clients } = options

      server.ext({
        type: 'onPostAuth',
        /**
         * @param {HapiRequestWithScopes} request
         */
        method: (request, h) => {
          const clientId = request.auth?.artifacts?.client_id

          request.app.scopes = findScopesForClient(clientId, clients)

          return h.continue
        }
      })
    }
  }
}

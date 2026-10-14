/** @import {ClientsScopes} from '../../lib/clients/create.js' */
/** @import {HapiRequestWithScopes} from '../../types/api.js' */
/** @import {Server} from '@hapi/hapi' */

/**
 * @typedef {HapiRequestWithScopes} HapiRequestWithScopes
 *
 * @typedef {Object} ClientScopesOptions
 * @property {ClientsScopes} clientsScopes
 */

/**
 * Returns the union of scopes granted to `clientId` across every matching
 * client scope entry. Returns `[]` when the client is not present.
 *
 * @param {string | null | undefined} clientId
 * @param {ClientsScopes} clientsScopes
 * @returns {string[]}
 */
export const findScopesForClient = (clientId, clientsScopes) => {
  if (!clientId) {
    return []
  }

  const merged = new Set()

  for (const entry of clientsScopes) {
    if (entry.client_id === clientId) {
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
     * @param {Server} server
     * @param {ClientScopesOptions} options
     */
    register: (server, options) => {
      const { clientsScopes } = options

      server.ext({
        type: 'onPostAuth',
        /**
         * @param {HapiRequestWithScopes} request
         */
        method: (request, h) => {
          const clientId = request.auth?.artifacts?.client_id

          request.app.scopes = findScopesForClient(clientId, clientsScopes)

          return h.continue
        }
      })
    }
  }
}

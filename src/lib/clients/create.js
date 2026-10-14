/**
 * @typedef {Object} ClientScope
 * @property {string} client_id
 * @property {string[]} scopes
 *
 * @typedef {ClientScope[]} ClientsScopes
 *
 * @typedef {Object} ClientAccessConfig
 * @property {string[]} piiAllowed
 * @property {string[]} writeAllowed
 */

/**
 * Builds the client scopes consumed by authorization from the environment
 * configuration. Separate lists allow a client to have either or both scopes.
 *
 * @param {ClientAccessConfig} access
 * @returns {ClientsScopes}
 */
export const createClientsScopes = ({ piiAllowed, writeAllowed }) => [
  ...piiAllowed.map((clientId) => ({ client_id: clientId, scopes: ['pii'] })),
  ...writeAllowed.map((clientId) => ({
    client_id: clientId,
    scopes: ['write']
  }))
]

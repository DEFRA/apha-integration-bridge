import { enterMaskingContext } from '../../lib/pii/index.js'

const PII_SCOPE = 'pii'

/**
 * @typedef {import('@hapi/hapi').Request} Hapi.Request
 * @typedef {Hapi.Request & { app: { scopes?: string[] }}} HapiRequestWithScopes
 */

/**
 * Hapi plugin that establishes the per-request masking context. Reads
 * `request.app.scopes` (populated upstream by the client-scopes plugin) and
 * masks PII unless the `pii` scope is present.
 *
 * Fail-closed: if `request.app.scopes` is not populated, masking is enabled.
 */
export const piiContextPlugin = {
  plugin: {
    name: 'piiContextPlugin',
    version: '0.0.0',
    /**
     * @param {import('@hapi/hapi').Server} server
     */
    register: (server) => {
      server.ext({
        type: 'onPreHandler',
        /**
         * @param {HapiRequestWithScopes} request
         */
        method: (request, h) => {
          const scopes = request.app.scopes ?? []

          const shouldMask = !scopes.includes(PII_SCOPE)

          enterMaskingContext({ shouldMask })

          return h.continue
        }
      })
    }
  }
}

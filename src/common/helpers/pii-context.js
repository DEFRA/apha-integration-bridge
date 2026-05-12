import { runWithMaskingContext } from '../../lib/pii/index.js'

const PII_SCOPE = 'pii'

/**
 * @typedef {import('../../types/api.js').HapiRequestWithScopes} HapiRequestWithScopes
 * @typedef {import('@hapi/hapi').Lifecycle.Method} HandlerMethod
 */

/**
 * Tracks the original (unwrapped) route handler for each route, keyed by the
 * route's settings object. A WeakMap avoids mutating Hapi's `RouteSettings`
 * type and lets entries be garbage-collected if Hapi ever removes a route.
 *
 * @type {WeakMap<import('@hapi/hapi').RouteSettings, HandlerMethod>}
 */
const originalHandlers = new WeakMap()

/**
 * Hapi plugin that establishes the per-request masking context. Reads
 * `request.app.scopes` (populated upstream by the client-scopes plugin) and
 * masks PII unless the `pii` scope is present.
 *
 * Implementation: wraps the route handler in `runWithMaskingContext`, which
 * uses `AsyncLocalStorage.run(...)` to create a proper async-context boundary
 * for the masking store. `enterWith` would be simpler but is incompatible
 * with downstream plugins that wrap the handler in their own `als.run(...)`
 * call (e.g. the OpenTelemetry plugin's `context.with(...)`), which causes
 * `storage.getStore()` to be undefined inside the handler.
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
          const { settings } = request.route

          if (!originalHandlers.has(settings)) {
            originalHandlers.set(
              settings,
              /** @type {HandlerMethod} */ (settings.handler)
            )
          }

          const original = originalHandlers.get(settings)

          if (typeof original === 'function') {
            /**
             * Each request reassigns the route's handler to a wrapper. The
             * wrapper reads `request.app.scopes` from the actual calling
             * request at invocation time (not captured in closure), so
             * concurrent requests cannot leak each other's masking state.
             */
            settings.handler =
              /**
               * @this {null}
               * @param {HapiRequestWithScopes} request
               * @param {import('@hapi/hapi').ResponseToolkit} h
               */
              function (request, h) {
                const scopes = request.app.scopes ?? []
                const shouldMask = !scopes.includes(PII_SCOPE)

                return runWithMaskingContext({ shouldMask }, () =>
                  original.call(this, request, h)
                )
              }
          }

          return h.continue
        }
      })
    }
  }
}

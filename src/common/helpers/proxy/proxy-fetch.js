import { fetch as undiciFetch, ProxyAgent } from 'undici'
import { config } from '../../../config.js'

/**
 * Routes a fetch through the configured egress proxy when HTTP_PROXY is set.
 *
 * The proxy path uses undici's OWN `fetch` together with undici's `ProxyAgent`
 * so the dispatcher and the fetch come from the SAME undici version. Passing a
 * userland-undici dispatcher into Node's *built-in* global fetch mixes two
 * different undici versions (Node's built-in vs the `undici` dependency) and
 * throws `UND_ERR_INVALID_ARG: invalid onRequestStart method` at request time
 * once their handler interfaces diverge (e.g. built-in v7 vs dependency v8).
 *
 * The no-proxy path deliberately stays on the global fetch: it passes no
 * dispatcher (so there is no version mixing) and remains interceptable by test
 * tooling such as MSW, which patches globalThis.fetch.
 *
 * Typed with the global fetch signature so callers (e.g. jose's
 * `customFetch`) can substitute it anywhere a fetch implementation is
 * expected. The undici branch is asserted back to the global types: undici
 * declares its own structurally-equivalent Request/Response that tsc treats
 * as distinct types.
 *
 * @param {Parameters<typeof fetch>[0]} url
 * @param {Parameters<typeof fetch>[1]} [options]
 * @returns {ReturnType<typeof fetch>}
 */
export function proxyFetch(url, options) {
  const proxyUrlConfig = config.get('httpProxy') // bound to HTTP_PROXY

  if (!proxyUrlConfig) {
    return fetch(url, options)
  }

  return /** @type {ReturnType<typeof fetch>} */ (
    /** @type {unknown} */ (
      undiciFetch(/** @type {import('undici').RequestInfo} */ (url), {
        .../** @type {import('undici').RequestInit} */ (options),
        dispatcher: new ProxyAgent({
          uri: proxyUrlConfig,
          keepAliveTimeout: 10,
          keepAliveMaxTimeout: 10
        })
      })
    )
  )
}

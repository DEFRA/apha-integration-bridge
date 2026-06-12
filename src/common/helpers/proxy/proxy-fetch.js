import { EnvHttpProxyAgent } from 'undici'

/**
 * Default timeout for JWKS fetch operations (in milliseconds)
 */
const JWKS_FETCH_TIMEOUT_MS = 5000

export function proxyFetch(url, options) {
  const timeoutSignal = AbortSignal.timeout(JWKS_FETCH_TIMEOUT_MS)
  const signal = options?.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal

  return fetch(url, { ...options, signal, dispatcher: new EnvHttpProxyAgent() })
}

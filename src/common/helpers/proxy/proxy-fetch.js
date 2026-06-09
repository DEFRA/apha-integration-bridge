import { ProxyAgent } from 'undici'
import { config } from '../../../config.js'

/**
 * Default timeout for JWKS fetch operations (in milliseconds)
 */
const JWKS_FETCH_TIMEOUT_MS = 5000

export function proxyFetch(url, options) {
  const proxyUrlConfig = config.get('httpProxy') // bound to HTTP_PROXY

  const timeoutSignal = AbortSignal.timeout(JWKS_FETCH_TIMEOUT_MS)
  const signal = options?.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal

  if (!proxyUrlConfig) {
    return fetch(url, { ...options, signal })
  }

  return fetch(url, {
    ...options,
    signal,
    dispatcher: new ProxyAgent({
      uri: proxyUrlConfig,
      keepAliveTimeout: 10,
      keepAliveMaxTimeout: 10
    })
  })
}

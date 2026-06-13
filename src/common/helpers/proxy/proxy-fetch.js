import { EnvHttpProxyAgent } from 'undici'

/**
 * Default timeout for fetch operations (in milliseconds)
 */
const FETCH_TIMEOUT_MS = 20_000

export function proxyFetch(url, options) {
  const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS)

  const signals = [timeoutSignal]

  if (options?.signal) {
    signals.push(options.signal)
  }

  const abortSignal = AbortSignal.any(signals)

  return fetch(url, {
    ...options,
    signal: abortSignal,
    dispatcher: new EnvHttpProxyAgent()
  })
}

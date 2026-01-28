import { ProxyAgent } from 'undici'
import { config } from '../../../config.js'

export function proxyFetch(url, options) {
  const proxyUrlConfig = config.get('httpProxy') // bound to HTTP_PROXY

  if (!proxyUrlConfig) {
    return fetch(url, options)
  }

  return fetch(url, {
    ...options,
    dispatcher: new ProxyAgent({
      uri: proxyUrlConfig,
      keepAliveTimeout: 10,
      keepAliveMaxTimeout: 10
    })
  })
}

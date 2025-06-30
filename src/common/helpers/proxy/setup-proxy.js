import { createLogger } from '../logging/logger.js'

const logger = createLogger()

/**
 * Skip configuring global proxies
 */
export function setupProxy() {
  logger.info('Skipping setup of up global proxies')
}

import { config } from '../../config.js'

import { createServer } from '../../server.js'
import { createLogger } from './logging/logger.js'

/**
 * Creates and starts a Hapi server instance.
 *
 * If server creation or startup fails the error is logged and the
 * function resolves to `undefined`.
 *
 * @returns {Promise<import('@hapi/hapi').Server | undefined>} The running
 * server or `undefined` when startup fails.
 */
async function startServer() {
  let server

  try {
    server = await createServer()

    await server.start()

    server.logger.info('Server started successfully')

    server.logger.info(
      `Access your backend on http://localhost:${config.get('port')}`
    )
  } catch (error) {
    const logger = createLogger()
    logger.info('Server failed to start :(')
    logger.error(error)
  }

  return server
}

export { startServer }

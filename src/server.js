import Hapi from '@hapi/hapi'

import { config } from './config.js'
import { router } from './plugins/router.js'
import { requestLogger } from './common/helpers/logging/request-logger.js'
import { mongoDb } from './common/helpers/mongodb.js'
import { oracleDb } from './common/helpers/oracledb.js'
import { failAction } from './common/helpers/fail-action.js'
import { secureContext } from './common/helpers/secure-context/index.js'
import { pulse } from './common/helpers/pulse.js'
import { requestTracing } from './common/helpers/request-tracing.js'
import { setupProxy } from './common/helpers/proxy/setup-proxy.js'

async function createServer() {
  setupProxy()

  const server = Hapi.server({
    host: config.get('host'),
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        },
        failAction
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    }
  })

  await server.register([
    /**
     * automatically logs incoming requests
     */
    requestLogger,
    /**
     * trace header logging and propagation
     */
    requestTracing,
    /**
     * loads CA certificates from environment config
     */
    secureContext,
    /**
     * provides shutdown handlers
     */
    pulse,
    /**
     * sets up mongo connection pool and attaches to `server` and `request` objects
     */
    mongoDb,
    /**
     * sets up OracleDB connection pool(s) and attaches to `server` and `request` objects
     */
    oracleDb,
    /**
     * routes used in the app
     */
    router
  ])

  return server
}

export { createServer }

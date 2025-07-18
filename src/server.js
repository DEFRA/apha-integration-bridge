import './lib/telemetry/index.js'

import Hapi from '@hapi/hapi'
import inert from '@hapi/inert'
import vision from '@hapi/vision'
import path from 'node:path'

import { openApi } from './common/helpers/swagger.js'
import { config } from './config.js'
import { requestLogger } from './common/helpers/logging/request-logger.js'
import { routingPlugin } from './common/helpers/routing.js'
import { bearerTokenPlugin } from './common/helpers/bearer-token.js'
// import { authPlugin } from './common/helpers/auth.js'
// import { mongoDb } from './common/helpers/mongodb.js'
import { oracleDb } from './common/helpers/oracledb.js'
import { failAction } from './common/helpers/fail-action.js'
import { secureContext } from './common/helpers/secure-context/index.js'
import { pulse } from './common/helpers/pulse.js'
import { requestTracing } from './common/helpers/request-tracing.js'
import { setupProxy } from './common/helpers/proxy/setup-proxy.js'
import { versionPlugin } from './common/helpers/versioning.js'
import { opentelemetryPlugin } from './common/helpers/telemetry.js'
import { HTTPException } from './lib/http/http-exception.js'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

/**
 * Builds and configures a Hapi server instance.
 *
 * The server is configured with logging, tracing and database plugins and
 * registers the application routes.
 *
 * @returns {Promise<import('@hapi/hapi').Server>} A configured but not started
 * Hapi server.
 */
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

  /**
   * ensure we handle 404 errors with the expected response payload
   */
  server.route({
    method: '*',
    path: '/{p*}',
    handler: function (request) {
      const { method, path } = request

      return new HTTPException(
        'NOT_FOUND',
        `No route: [${method.toUpperCase()}] ${path}`
      ).boomify()
    }
  })

  await server.register([
    /**
     * plugin for handling static files
     *
     * @see https://hapi.dev/module/inert/
     */
    inert,
    /**
     * template rendering support for hapi.js
     *
     * @see https://hapi.dev/module/vision/
     */
    vision,
    /**
     * optionally authenticates incoming requests using JWT tokens
     */
    // authPlugin,
    /**
     * check for the presence of a bearer token in the request
     */
    bearerTokenPlugin,
    /**
     * sets up opentelemetry tracing and metrics
     */
    opentelemetryPlugin,
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
    // mongoDb,
    /**
     * sets up OracleDB connection pool(s) and attaches to `server` and `request` objects
     */
    oracleDb,
    /**
     * sets up header-based api versioning for the API
     */
    {
      plugin: versionPlugin
    },
    /**
     * openapi swagger plugin
     */
    openApi,
    /**
     * routes used in the app
     */
    {
      plugin: routingPlugin,
      options: {
        routesDirectory: path.join(__dirname, 'routes'),
        logRoutes: true
      }
    }
  ])

  return server
}

export { createServer }

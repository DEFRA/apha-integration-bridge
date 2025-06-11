'use strict'

import { globSync } from 'glob'
import path from 'node:path'

/**
 * @typedef {import('@hapi/hapi').Server} Server
 * @typedef {import('@hapi/hapi').Request} Request
 * @typedef {import('@hapi/hapi').ResponseToolkit} ResponseToolkit
 */

/**
 * @typedef {Object} VersionPluginOptions
 * @property {string} [routesDirectory] - The absolute path to the directory containing route files.
 * @property {boolean} [logRoutes=false] - Whether to log the registered routes.
 */

/**
 * Creates a Hapi.js plugin for routing based on the specified directory.
 *
 * @param {string} directory the directory containing route files
 *
 * @returns {Object} a Hapi.js plugin for routing
 */
export const routingPlugin = {
  name: 'routingPlugin',
  version: '0.0.0',
  /**
   * Registers the plugin with the Hapi server.
   * @param {Server} server - The Hapi.js server instance.
   * @param {VersionPluginOptions} [options={}] - Plugin options.
   */
  register: async (server, options) => {
    const { routesDirectory, logRoutes } = options

    if (!routesDirectory) {
      throw new Error('routesDirectory option is required')
    }

    /**
     * Use glob to find all route files in the specified directory
     */
    const routeFiles = globSync('**/*.js', { cwd: routesDirectory })

    /**
     * Import and register each route file
     */
    for (const file of routeFiles) {
      if (file.includes('.test')) {
        continue
      }

      const filePath = path.join(routesDirectory, file)

      /**
       * Dynamically import the route module
       */
      const routeModule = await import(filePath)

      let routes = routeModule.default

      if (!routeModule.default) {
        if (routeModule.handler) {
          routes = {
            handler: routeModule.handler,
            options: routeModule.options || {}
          }
        } else {
          server.logger.warn(
            `Route in ${filePath} does not export a default route or handler`
          )

          continue
        }
      }

      if (!Array.isArray(routes)) {
        /**
         * ensure we have an array of routes
         * if a single route object is provided, wrap it in an array
         */
        routes = [routes]
      }

      for (const route of routes) {
        if (!route.handler) {
          server.logger.warn(`Route in ${filePath} does not have a handler`)

          continue
        }

        let method = 'GET'

        if (route.method) {
          /**
           * Ensure method is uppercase
           */
          method = route.method.toUpperCase()
        } else {
          const [, filepathMethod] = file.match(/\.([a-z]+)\.js$/) || []

          if (filepathMethod) {
            /**
             * Extract method from file name if available
             * e.g. {exampleId}.get.js -> GET
             */
            method = filepathMethod.toUpperCase()
          }
        }

        let pathname = route.path

        if (!pathname) {
          /**
           * default path based on file name
           */
          pathname = `/${file.replace(/(\.\w+)?\.js$/, '')}`
        }

        await server.route({
          ...route,
          path: pathname,
          method
        })

        if (logRoutes) {
          server.logger.info(`Route [${method}] ${pathname}`)
        }
      }
    }
  }
}

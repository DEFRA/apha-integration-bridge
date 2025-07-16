'use strict'

/**
 * @typedef {import('@hapi/hapi').Server} Server
 * @typedef {import('@hapi/hapi').Request} Request
 * @typedef {import('@hapi/hapi').ResponseToolkit} ResponseToolkit
 */

/**
 * @typedef {Object} VersionPluginOptions
 * @property {number} [defaultVersion=1.0] - The default API version to use if none is specified in the Accept header.
 */

/**
 * A Hapi.js plugin that parses API version from the Accept header and decorates the request.
 */
export const versionPlugin = {
  name: 'versionPlugin',
  version: '1.0.0',

  /**
   * Registers the plugin with the Hapi server.
   * @param {Server} server - The Hapi.js server instance.
   * @param {VersionPluginOptions} [options={}] - Plugin options.
   */
  register: (server, options = {}) => {
    const { defaultVersion = 1.0 } = options

    server.ext('onRequest', (request, h) => {
      const acceptHeader = request.headers.accept

      const versionMatch = acceptHeader
        ? acceptHeader.match(/vnd\.apha\.(\d+(\.\d+)?)/)
        : null

      const resolvedVersion = versionMatch
        ? parseFloat(versionMatch[1])
        : defaultVersion

      // Decorate the request with the resolved API version
      request.pre.apiVersion = resolvedVersion

      return h.continue
    })
  }
}

import Boom from '@hapi/boom'

/**
 * @typedef {import('@hapi/hapi').Server} Server
 * @typedef {import('@hapi/hapi').Request} Request
 * @typedef {import('@hapi/hapi').ResponseToolkit} ResponseToolkit
 */

/**
 * Hapi plugin that adds comprehensive security headers to all responses.

 * Headers added:
 * - Content-Security-Policy: Strict policy for API routes only
 * - Cache-Control: no-store (API routes only, to prevent caching of PII)
 * - Pragma: no-cache (API routes only)
 * - Referrer-Policy: no-referrer (all routes)
 * - Cross-Origin-Opener-Policy: same-origin (all routes)
 * - Cross-Origin-Resource-Policy: same-origin (all routes)
 * - Permissions-Policy: Disables camera, microphone, geolocation, browsing-topics (all routes)
 *
 * This plugin complements the security headers already set by Hapi's routes.security configuration (HSTS, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection).
 */
export const securityHeaders = {
  plugin: {
    name: 'securityHeaders',
    version: '0.0.0',
    /**
     * @param {Server} server
     */
    register: (server) => {
      server.ext('onPreResponse', (request, h) => {
        const { response } = request

        const headers = Boom.isBoom(response)
          ? response.output.headers
          : response.headers

        /**
         * Helper function to set a header value (lowercase for Boom compatibility)
         * @param {string} key - Header name
         * @param {string} value - Header value
         */
        const set = (key, value) => {
          headers[key.toLowerCase()] = value
        }

        // Headers applied to all routes
        set('Referrer-Policy', 'no-referrer')
        set('Cross-Origin-Opener-Policy', 'same-origin')
        set('Cross-Origin-Resource-Policy', 'same-origin')
        set(
          'Permissions-Policy',
          'camera=(), microphone=(), geolocation=(), browsing-topics=()'
        )

        const path = request.path || ''
        const isDocs =
          path.startsWith('/documentation') || path.startsWith('/swaggerui')

        // For non-documentation routes (API routes), apply additional strict headers
        if (!isDocs) {
          set(
            'Content-Security-Policy',
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
          )
          set('Cache-Control', 'no-store')
          set('Pragma', 'no-cache')
        }

        return h.continue
      })
    }
  }
}

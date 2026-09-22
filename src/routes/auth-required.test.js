import { describe, test, expect, beforeAll } from '@jest/globals'
import { globSync } from 'glob'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { spyOnConfigMany } from '../common/helpers/test-helpers/config.js'

// Force feature-flagged routes to register so an `auth: false` opt-out can't
// hide behind a disabled flag. Every route file below is imported dynamically
// (after this mock is installed) for exactly that reason.
spyOnConfigMany({
  'featureFlags.isCaseManagementEnabled': true,
  'featureFlags.isTokenEndpointEnabled': true
})

const __dirname = path.dirname(new URL(import.meta.url).pathname)

/**
 * Route files that intentionally serve unauthenticated traffic:
 * - health: load-balancer probes, no PII
 * - documentation/scalar + swaggerui/cognito-auth: static docs/UI assets
 * - oauth2/token: the token-issuing endpoint itself (lower environments only)
 * - alpha/*: canned mock endpoints, documented as unauthenticated
 *
 * Everything else must require authentication. Add to this list only with a
 * documented reason — this test exists because an `auth: false` on a real API
 * route shipped unnoticed.
 */
const PUBLIC_ROUTE_FILES = new Set([
  'health.get.js',
  'documentation/scalar.get.js',
  'swaggerui/cognito-auth.get.js',
  'oauth2/token.post.js'
])

/**
 * @param {string} relativePath Path relative to src/routes, posix separators
 */
function isPublicRouteFile(relativePath) {
  return (
    PUBLIC_ROUTE_FILES.has(relativePath) || relativePath.startsWith('alpha/')
  )
}

/**
 * @param {unknown} auth The route's `options.auth` value
 * @returns {boolean} True when the route can serve unauthenticated traffic
 */
function optsOutOfAuth(auth) {
  if (auth === false) {
    return true
  }

  if (auth && typeof auth === 'object') {
    const mode = /** @type {{ mode?: unknown }} */ (auth).mode

    // 'try' and 'optional' both allow requests without valid credentials.
    if (mode === 'try' || mode === 'optional') {
      return true
    }
  }

  return false
}

describe('route authentication coverage', () => {
  /**
   * @type {{ file: string, method: unknown, path: unknown, auth: unknown }[]}
   */
  const collectedRoutes = []

  beforeAll(async () => {
    const routesDirectory = __dirname
    const routeFiles = globSync('**/*.js', { cwd: routesDirectory })

    for (const file of routeFiles) {
      // Skip test files and browser-side scripts (not route handlers),
      // mirroring the production routing plugin.
      if (file.includes('.test') || file.endsWith('-script.js')) {
        continue
      }

      const filePath = path.join(routesDirectory, file)
      const routeModule = await import(pathToFileURL(filePath).href)

      let routes = routeModule.default

      if (!routes) {
        if (routeModule.handler) {
          routes = {
            handler: routeModule.handler,
            options: routeModule.options || {}
          }
        } else {
          // Not a route file (mocks, helpers) — nothing to check.
          continue
        }
      }

      if (routes === null) {
        throw new Error(
          `Route in ${file} exported null: enable its feature flag in this test so its auth setting is checked`
        )
      }

      const routeArray = Array.isArray(routes) ? routes : [routes]

      for (const route of routeArray) {
        if (!route.handler) {
          continue
        }

        collectedRoutes.push({
          file,
          method: route.method,
          path: route.path,
          auth: route.options?.auth
        })
      }
    }

    // Sanity: the glob must actually find routes, otherwise this test is vacuous.
    expect(collectedRoutes.length).toBeGreaterThan(0)
  })

  test('no non-public route opts out of authentication', () => {
    const violations = collectedRoutes.filter(
      (route) => !isPublicRouteFile(route.file) && optsOutOfAuth(route.auth)
    )

    expect(
      violations.map(
        (route) =>
          `${route.file} [${route.method ?? '?'}] ${route.path ?? '(path derived at runtime)'} has auth opt-out: ${JSON.stringify(route.auth)}`
      )
    ).toEqual([])
  })
})

import { describe, test, expect, beforeAll } from '@jest/globals'
import { config } from '../../config.js'
import { spyOnConfigMany } from '../../common/helpers/test-helpers/config.js'

spyOnConfigMany({
  'featureFlags.isCaseManagementEnabled': true
})

/** @type {typeof import('./case/case.js')} */
let caseRoute
/** @type {typeof import('./case/{caseId}.js')} */
let caseIdRoute
/** @type {typeof import('./users/find.js')} */
let findRoute

beforeAll(async () => {
  // Import routes after config is mocked
  caseRoute = await import('./case/case.js')
  caseIdRoute = await import('./case/{caseId}.js')
  findRoute = await import('./users/find.js')
})

describe('Case Management Feature Flag', () => {
  describe('feature flag configuration', () => {
    test('should have default value of false in config', () => {
      const schema = config.getSchema()
      const defaultValue =
        schema._cvtProperties.featureFlags._cvtProperties
          .isCaseManagementEnabled.default
      expect(defaultValue).toBe(false)
    })
  })

  describe('when CASE_MANAGEMENT_ENABLED is true', () => {
    test('config should have feature flag enabled', () => {
      const isEnabled = config.get('featureFlags.isCaseManagementEnabled')
      expect(isEnabled).toBe(true)
    })

    test('POST /case-management/case route should be registered', () => {
      expect(caseRoute.default).not.toBeNull()
      expect(caseRoute.default).toHaveProperty('method', 'POST')
      expect(caseRoute.default).toHaveProperty('path', '/case-management/case')
      expect(caseRoute.default).toHaveProperty('handler')
    })

    test('GET /case-management/case/{caseId} route should be registered', () => {
      expect(caseIdRoute.default).not.toBeNull()
      expect(caseIdRoute.default).toHaveProperty('method', 'GET')
      expect(caseIdRoute.default).toHaveProperty(
        'path',
        '/case-management/case/{caseId}'
      )
      expect(caseIdRoute.default).toHaveProperty('handler')
    })

    test('POST /case-management/users/find route should be registered', () => {
      expect(findRoute.default).not.toBeNull()
      expect(findRoute.default).toHaveProperty('method', 'POST')
      expect(findRoute.default).toHaveProperty(
        'path',
        '/case-management/users/find'
      )
      expect(findRoute.default).toHaveProperty('handler')
    })

    test('all case management routes should be enabled', () => {
      const routes = [caseRoute.default, caseIdRoute.default, findRoute.default]

      // Verify all routes are not null
      routes.forEach((route) => {
        expect(route).not.toBeNull()
      })

      // Verify count
      const enabledRoutes = routes.filter((route) => route !== null)
      expect(enabledRoutes).toHaveLength(3)
    })
  })
})

import { describe, test, expect, beforeAll } from '@jest/globals'
import { spyOnConfig } from '../../common/helpers/test-helpers/config.js'

spyOnConfig('featureFlags.isCaseManagementEnabled', true)

/** @type {typeof import('./case/case.js')} */
let caseRoute
/** @type {typeof import('./case/{caseId}.js')} */
let caseIdRoute
/** @type {typeof import('./users/find.js')} */
let findRoute

beforeAll(async () => {
  caseRoute = await import('./case/case.js')
  caseIdRoute = await import('./case/{caseId}.js')
  findRoute = await import('./users/find.js')
})

describe('Case Management Feature Flag - Enabled', () => {
  test('routes should be defined when flag is enabled', () => {
    expect(caseRoute.default).toBeDefined()
    expect(caseIdRoute.default).toBeDefined()
    expect(findRoute.default).toBeDefined()
  })
})

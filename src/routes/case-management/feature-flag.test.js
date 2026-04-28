import { describe, test, expect } from '@jest/globals'
import { spyOnConfig } from '../../common/helpers/test-helpers/config.js'

describe('Case Management Feature Flag', () => {
  test('routes should be defined when flag is enabled', async () => {
    spyOnConfig('featureFlags.isCaseManagementEnabled', true)

    const caseRoute = await import('./case/case.js')
    const caseIdRoute = await import('./case/{caseId}.js')
    const findRoute = await import('./users/find.js')

    expect(caseRoute.default).toBeDefined()
    expect(caseIdRoute.default).toBeDefined()
    expect(findRoute.default).toBeDefined()
  })
})

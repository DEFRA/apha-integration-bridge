import { beforeAll, describe, expect, test } from '@jest/globals'

import { spyOnConfig } from '../../../common/helpers/test-helpers/config.js'

spyOnConfig('featureFlags.isHpaiDiscoveryEnabled', false)

/** @type {typeof import('./discovery.js')} */
let discoveryRoute

beforeAll(async () => {
  discoveryRoute = await import('./discovery.js')
})

describe('HPAI discovery feature flag - disabled', () => {
  test('the route is not registered', () => {
    expect(discoveryRoute.default).toBeNull()
  })
})

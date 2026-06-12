import { afterEach, describe, expect, test } from '@jest/globals'

import { config } from '../../config.js'
import { applyNonProductionMetricName } from './metric-naming.js'

const original = {
  isLowerEnvironment: config.get('isLowerEnvironment')
}

afterEach(() => {
  config.set('isLowerEnvironment', original.isLowerEnvironment)
})

describe('applyNonProductionMetricName', () => {
  test('treats an absent CDP_ENV as a lower environment by default', () => {
    expect(config.default('isLowerEnvironment')).toBe(true)

    expect(applyNonProductionMetricName('oracledb.healthcheck.status')).toBe(
      'oracledb.healthcheck.status.nonprod'
    )
    expect(applyNonProductionMetricName('request.latency.5XX')).toBe(
      'request.latency.5XX.nonprod'
    )
  })

  test('returns names unchanged in the production environment (CDP_ENV=prod)', () => {
    config.set('isLowerEnvironment', false)

    expect(applyNonProductionMetricName('oracledb.healthcheck.status')).toBe(
      'oracledb.healthcheck.status'
    )
    expect(applyNonProductionMetricName('request.latency.5XX')).toBe(
      'request.latency.5XX'
    )
  })

  describe('in a lower (non-production) environment', () => {
    test('suffixes metrics whose name begins with a configured prefix', () => {
      config.set('isLowerEnvironment', true)

      expect(applyNonProductionMetricName('oracledb.healthcheck.status')).toBe(
        'oracledb.healthcheck.status.nonprod'
      )
      expect(applyNonProductionMetricName('oracledb.connection.time')).toBe(
        'oracledb.connection.time.nonprod'
      )
    })

    test('suffixes metrics whose name exactly matches a configured entry', () => {
      config.set('isLowerEnvironment', true)

      expect(applyNonProductionMetricName('oracledb.execution.time')).toBe(
        'oracledb.execution.time.nonprod'
      )
      expect(applyNonProductionMetricName('request.latency.5XX')).toBe(
        'request.latency.5XX.nonprod'
      )
    })

    test('leaves non-targeted metrics unchanged', () => {
      config.set('isLowerEnvironment', true)

      expect(applyNonProductionMetricName('request.latency.2XX')).toBe(
        'request.latency.2XX'
      )
      expect(applyNonProductionMetricName('request.latency.4XX')).toBe(
        'request.latency.4XX'
      )
      expect(applyNonProductionMetricName('customersFindRequest')).toBe(
        'customersFindRequest'
      )
    })
  })
})

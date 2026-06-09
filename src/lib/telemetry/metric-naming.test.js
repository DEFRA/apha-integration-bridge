import { afterEach, describe, expect, test } from '@jest/globals'

import { config } from '../../config.js'
import { applyNonProductionMetricName } from './metric-naming.js'

const original = {
  isCDPProduction: config.get('isCDPProduction')
}

afterEach(() => {
  config.set('isCDPProduction', original.isCDPProduction)
})

describe('applyNonProductionMetricName', () => {
  test('returns names unchanged in the production CDP environment', () => {
    config.set('isCDPProduction', true)

    expect(applyNonProductionMetricName('oracledb.healthcheck.status')).toBe(
      'oracledb.healthcheck.status'
    )
    expect(applyNonProductionMetricName('request.latency.5XX')).toBe(
      'request.latency.5XX'
    )
  })

  describe('in a non-production CDP environment', () => {
    test('suffixes metrics whose name begins with a configured prefix', () => {
      config.set('isCDPProduction', false)

      expect(applyNonProductionMetricName('oracledb.healthcheck.status')).toBe(
        'oracledb.healthcheck.status.nonprod'
      )
      expect(applyNonProductionMetricName('oracledb.connection.time')).toBe(
        'oracledb.connection.time.nonprod'
      )
    })

    test('suffixes metrics whose name exactly matches a configured entry', () => {
      config.set('isCDPProduction', false)

      expect(applyNonProductionMetricName('oracledb.execution.time')).toBe(
        'oracledb.execution.time.nonprod'
      )
      expect(applyNonProductionMetricName('request.latency.5XX')).toBe(
        'request.latency.5XX.nonprod'
      )
    })

    test('leaves non-targeted metrics unchanged', () => {
      config.set('isCDPProduction', false)

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

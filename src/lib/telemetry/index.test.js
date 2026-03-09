import { describe, expect, test } from '@jest/globals'

import { shouldUseOtlpExporter } from './index.js'

describe('telemetry exporter selection', () => {
  test('disables OTLP exporter when running tests', () => {
    expect(
      shouldUseOtlpExporter({
        NODE_ENV: 'test',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318'
      })
    ).toBe(false)
  })

  test('enables OTLP exporter outside tests when endpoint is set', () => {
    expect(
      shouldUseOtlpExporter({
        NODE_ENV: 'production',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318'
      })
    ).toBe(true)
  })

  test('disables OTLP exporter when endpoint is not set', () => {
    expect(
      shouldUseOtlpExporter({
        NODE_ENV: 'production'
      })
    ).toBe(false)
  })
})

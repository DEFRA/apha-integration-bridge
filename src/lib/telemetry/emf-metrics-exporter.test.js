import {
  MeterProvider,
  PeriodicExportingMetricReader
} from '@opentelemetry/sdk-metrics'
import { Configuration, createMetricsLogger } from 'aws-embedded-metrics'
import { jest, expect, test } from '@jest/globals'

import { EMFMetricExporter } from './emf-metrics-exporter.js'

Configuration.debuggingLoggingEnabled = true

test('produces the expected metric content', async () => {
  const mockConsole = jest.fn()

  jest.useFakeTimers().setSystemTime(new Date('2025-01-01'))

  jest.spyOn(console, 'log').mockImplementation(mockConsole)

  const emf = createMetricsLogger()

  const exporter = new EMFMetricExporter({
    emf
  })

  const meterProvider = new MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter: exporter,
        exportIntervalMillis: 1
      })
    ]
  })

  const meter = meterProvider.getMeter('test')

  const requestCounter = meter.createCounter('requests', {
    description: 'Counts fake requests'
  })

  requestCounter.add(1, {
    environment: 'test'
  })

  await meterProvider.shutdown()

  await emf.flush()

  expect(mockConsole).toHaveBeenLastCalledWith(
    /**
     * this is a metric created using "emf.putMetric()" and then flushed
     * to determine the expected output
     *
     * @example `emf.putMetric('requests', 1, Unit.Count, StorageResolution.Standard)`
     */
    JSON.stringify({
      LogGroup: 'Unknown-metrics',
      ServiceName: 'Unknown',
      ServiceType: 'Unknown',
      _aws: {
        Timestamp: 1735689600000,
        CloudWatchMetrics: [
          {
            Dimensions: [['LogGroup', 'ServiceName', 'ServiceType']],
            Metrics: [
              {
                Name: 'requests',
                Unit: 'Count'
              }
            ],
            Namespace: 'aws-embedded-metrics'
          }
        ]
      },
      requests: 1
    })
  )
})

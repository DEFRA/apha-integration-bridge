import { trace } from '@opentelemetry/api'
import { NodeSDK } from '@opentelemetry/sdk-node'
import {
  MeterProvider,
  PeriodicExportingMetricReader
} from '@opentelemetry/sdk-metrics'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { JsonTraceSerializer } from '@opentelemetry/otlp-transformer'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { createMetricsLogger } from 'aws-embedded-metrics'

import { createLogger } from '../../common/helpers/logging/logger.js'
import { EMFMetricExporter } from './emf-metrics-exporter.js'

const logger = createLogger()

/**
 * @type {import("@opentelemetry/sdk-metrics").PushMetricExporter}
 */
let metricExporter

let spanProcessor = new SimpleSpanProcessor({
  shutdown: () => Promise.resolve(),
  export: (spans, result) => {
    const buffer = JsonTraceSerializer.serializeRequest(spans)

    if (buffer) {
      logger.trace(Buffer.from(buffer).toString('utf8'))
    }

    result({ code: 0 })
  }
})

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function shouldUseOtlpExporter(env = process.env) {
  return Boolean(env.OTEL_EXPORTER_OTLP_ENDPOINT) && env.NODE_ENV !== 'test'
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function shouldEnableMetricReader(env = process.env) {
  return env.NODE_ENV !== 'test'
}

/**
 * if an OTLP exporter endpoint is defined, use it for both metrics and traces
 */
if (shouldUseOtlpExporter()) {
  spanProcessor = new SimpleSpanProcessor(new OTLPTraceExporter({}))

  metricExporter = new OTLPMetricExporter({})
} else if (shouldEnableMetricReader()) {
  metricExporter = new EMFMetricExporter({
    emf: createMetricsLogger()
  })
}

const readers = []

if (metricExporter) {
  readers.push(
    new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 30_000
    })
  )
}

/**
 * define a meter provider that exports metrics every 30 seconds
 */
export const meterProvider = new MeterProvider({
  readers
})

export const meter = meterProvider.getMeter('metrics')

export const telemetry = new NodeSDK({
  /**
   * export tracing spans to stdout
   */
  spanProcessors: [spanProcessor]
})

export const tracer = trace.getTracer('request-tracer')

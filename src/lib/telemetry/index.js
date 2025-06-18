import { trace } from '@opentelemetry/api'
import { NodeSDK } from '@opentelemetry/sdk-node'
import {
  MeterProvider,
  PeriodicExportingMetricReader
} from '@opentelemetry/sdk-metrics'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor
} from '@opentelemetry/sdk-trace-base'
import { createMetricsLogger } from 'aws-embedded-metrics'

import { EMFMetricExporter } from './emf-metrics-exporter.js'

/**
 * @type {import("@opentelemetry/sdk-metrics").PushMetricExporter}
 */
let metricExporter = new EMFMetricExporter({
  emf: createMetricsLogger()
})

/**
 * @type {import("@opentelemetry/sdk-trace-base").SpanExporter}
 */
let spanExporter = new ConsoleSpanExporter()

/**
 * if an OTLP exporter endpoint is defined, use it for both metrics and traces
 */
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  spanExporter = new OTLPTraceExporter({})

  metricExporter = new OTLPMetricExporter({})
}

/**
 * define a meter provider that exports metrics every 30 seconds
 */
export const meterProvider = new MeterProvider({
  readers: [
    new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 30_000
    })
  ]
})

export const meter = meterProvider.getMeter('metrics')

export const telemetry = new NodeSDK({
  /**
   * export tracing spans to stdout
   */
  spanProcessors: [new SimpleSpanProcessor(spanExporter)]
})

export const tracer = trace.getTracer('request-tracer')

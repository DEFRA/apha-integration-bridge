import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import {
  MeterProvider,
  PeriodicExportingMetricReader
} from '@opentelemetry/sdk-metrics'
import { trace, context, propagation } from '@opentelemetry/api'
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor
} from '@opentelemetry/sdk-trace-base'
import { createMetricsLogger } from 'aws-embedded-metrics'

import { EMFMetricExporter } from '../../lib/telemetry/emf-metrics-exporter.js'

/**
 * define a meter provider that exports metrics every 30 seconds
 */
const meterProvider = new MeterProvider({
  readers: [
    new PeriodicExportingMetricReader({
      exporter: new EMFMetricExporter({
        emf: createMetricsLogger()
      }),
      exportIntervalMillis: 30_000
    })
  ]
})

export const meter = meterProvider.getMeter('metrics')

const sdk = new NodeSDK({
  /**
   * export tracing spans to stdout
   */
  spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
  instrumentations: [getNodeAutoInstrumentations()]
})

sdk.start()

/**
 * @typedef {import('@hapi/hapi').Request} Hapi.Request
 * @typedef {import('@opentelemetry/api').Span} OpenTelemetry.Span
 * @typedef {import('@opentelemetry/api').Tracer} OpenTelemetry.Tracer
 *
 * @typedef {Hapi.Request & { app: { span: OpenTelemetry.Span; tracer: OpenTelemetry.Tracer }}} HapiRequestWithTelemetry
 */

/**
 * Integrates vendor agnostic OpenTelemetry tracing into Hapi.js server requests. With support
 * for:
 * - Tracing HTTP requests
 * - Propagating trace context via headers
 * - Metrics (using AWS EMF format) for sum and gauge data points
 */
export const opentelemetryPlugin = {
  plugin: {
    name: 'opentelemetry',
    version: '0.0.0',
    /**
     * @param {import('@hapi/hapi').Server} server
     */
    register: async function (server) {
      server.events.on('stop', () => {
        /**
         * shutdown the sdk when the server is stopping
         *
         * @note this helps to ensure that all spans and metrics are flushed
         */
        return Promise.all([sdk.shutdown(), meterProvider.shutdown()])
      })

      const tracer = trace.getTracer('request-tracer')

      server.ext({
        type: 'onRequest',
        /**
         * @param {HapiRequestWithTelemetry} request
         */
        method: (request, h) => {
          const parentContext = propagation.extract(
            context.active(),
            request.headers
          )

          /**
           * define a span for the request
           */
          const span = tracer.startSpan(
            `[${request.method}] ${request.path}`,
            undefined,
            parentContext
          )

          span.setAttribute('http.method', request.method)

          span.setAttribute('http.route', request.route.path)

          request.app.span = span

          request.app.tracer = tracer

          /**
           * Run the rest of the request lifecycle within the span's context
           */
          return context.with(
            trace.setSpan(parentContext, span),
            () => h.continue
          )
        }
      })

      server.ext({
        type: 'onPreResponse',
        /**
         * @param {HapiRequestWithTelemetry} request
         */
        method: (request, h) => {
          const { span } = request.app

          if (span) {
            const { response } = request

            let statusCode = 500

            if (response instanceof Error) {
              statusCode = response.output ? response.output.statusCode : 500
            }

            if ('statusCode' in response) {
              statusCode = response.statusCode
            }

            span.setAttribute('http.status_code', statusCode)

            span.end()
          }

          return h.continue
        }
      })
    }
  }
}

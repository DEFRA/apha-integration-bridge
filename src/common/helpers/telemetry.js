import { trace, context } from '@opentelemetry/api'

import {
  meter,
  tracer,
  telemetry,
  meterProvider
} from '../../lib/telemetry/index.js'

const requestLatency2XX = meter.createGauge('request.latency.2XX', {
  description: 'Measures the latency of incoming 2XX requests',
  unit: 'Milliseconds'
})

const requestLatency4XX = meter.createGauge('request.latency.4XX', {
  description: 'Measures the latency of incoming 4XX requests',
  unit: 'Milliseconds'
})

const requestLatency5XX = meter.createGauge('request.latency.5XX', {
  description: 'Measures the latency of incoming 5XX requests',
  unit: 'Milliseconds'
})

/**
 * @typedef {import('@hapi/hapi').Request} Hapi.Request
 * @typedef {import('@opentelemetry/api').Span} OpenTelemetry.Span
 *
 * @typedef {Hapi.Request & { app: { startTime: number; span: OpenTelemetry.Span }}} HapiRequestWithSpan
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
      telemetry.start()

      server.events.on('stop', () => {
        /**
         * shutdown the sdk when the server is stopping
         *
         * @note this helps to ensure that all spans and metrics are flushed
         */
        return Promise.all([telemetry.shutdown(), meterProvider.shutdown()])
      })

      /**
       * configure the span that will be created for each request with the method and path
       */
      server.ext({
        type: 'onRequest',
        /**
         * @param {HapiRequestWithSpan} request
         */
        method: (request, h) => {
          const spanLabel = `[${request.method}] ${request.path}`

          /**
           * define a span for the request
           */
          request.app.span = tracer.startSpan(spanLabel)

          request.app.startTime = Date.now()

          return h.continue
        }
      })

      /**
       * wrap the request handler to ensure that the context is applied correctly to the handler
       *
       * @note without this step, child spans appear as root spans in the trace view
       */
      server.ext({
        type: 'onPreHandler',
        /**
         * @param {any} request
         */
        method: (request, h) => {
          const { span } = request.app

          /**
           * track the original handler for the request
           */
          if (!request.route.settings.originalHandler) {
            request.route.settings.originalHandler =
              request.route.settings.handler
          }

          /**
           * extract the handler for the request
           */
          const { originalHandler: handler } = request.route.settings

          if (typeof handler === 'function') {
            /**
             * dynamically wrap the handler to execute within the correct otel context
             */
            request.route.settings.handler = function (request, h) {
              return context.with(trace.setSpan(context.active(), span), () => {
                return handler.bind(request.route)(request, h)
              })
            }
          }

          return h.continue
        }
      })

      server.ext({
        type: 'onPreResponse',
        /**
         * @param {HapiRequestWithSpan} request
         */
        method: (request, h) => {
          const { span, startTime } = request.app

          if (span) {
            const { response } = request

            let statusCode = 500

            if (response instanceof Error) {
              statusCode = response.output ? response.output.statusCode : 500
            }

            if ('statusCode' in response) {
              statusCode = response.statusCode
            }

            span.setAttribute('http.method', request.method)

            span.setAttribute('http.route', request.route.path)

            span.setAttribute('http.status_code', statusCode)

            span.end()

            const dimensions = {
              method: request.method,
              route: request.route.path
            }

            const elapsed = Date.now() - startTime

            if (statusCode >= 200 && statusCode < 300) {
              requestLatency2XX.record(elapsed, dimensions)
            } else if (statusCode >= 400 && statusCode < 500) {
              requestLatency4XX.record(elapsed, dimensions)
            } else if (statusCode >= 500) {
              requestLatency5XX.record(elapsed, dimensions)
            }
          }

          return h.continue
        }
      })
    }
  }
}

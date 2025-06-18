import { ConsoleMetricExporter } from '@opentelemetry/sdk-metrics'
import { StorageResolution, Unit } from 'aws-embedded-metrics'

const DataPointType = {
  /**
   * A sum metric data point has a single numeric value and a
   * monotonicity-indicator.
   */
  SUM: 3,
  /**
   * A gauge metric data point has only a single numeric value.
   */
  GAUGE: 2
}

/**
 * Converts the descriptor unit to an AWS Embedded Metrics Unit.
 *
 * @param {string} unit
 *
 * @returns {import('aws-embedded-metrics').Unit}
 */
const resolveUnit = (unit) => {
  if (unit in Unit) {
    return Unit[unit]
  }

  return Unit.Count
}

/**
 * Extend the ConsoleMetricExporter to format and log metrics in EMF format, so that they
 * will be picked up and metrics created by the AWS CloudWatch agent.
 */
export class EMFMetricExporter extends ConsoleMetricExporter {
  /**
   * @typedef {import('aws-embedded-metrics').MetricsLogger} MetricsLogger
   * @param {{ emf: MetricsLogger }} options
   */
  constructor(options) {
    super()

    this.emf = options.emf
  }

  /**
   * @param {import('@opentelemetry/sdk-metrics').ResourceMetrics} resourceMetrics
   * @param {(result: { code: number }) => void} resultCallback
   */
  async export(resourceMetrics, resultCallback) {
    const { emf } = this

    const { attributes } = resourceMetrics.resource

    for (const [key, value] of Object.entries(attributes)) {
      /**
       * skip opentelemetry specific attributes
       * such as telemetry.sdk.language, service.name, etc.
       * to avoid polluting the EMF with unnecessary data
       */
      if (
        !['telemetry.', 'service.'].some((prefix) => key.startsWith(prefix))
      ) {
        emf.putDimensions({ [key]: String(value) })
      }
    }

    for (const scope of resourceMetrics.scopeMetrics) {
      for (const metric of scope.metrics) {
        console.log(metric.descriptor.unit)
        switch (metric.dataPointType) {
          case DataPointType.SUM:
          case DataPointType.GAUGE: {
            for (const datapoint of metric.dataPoints) {
              /**
               * push the metric that has been recorded inside
               * opentelemetry to EMF
               */
              emf.putMetric(
                metric.descriptor.name,
                Number(datapoint.value),
                resolveUnit(metric.descriptor.unit),
                StorageResolution.Standard
              )
            }

            break
          }
          default: {
            console.warn(
              `Ignoring unsupported metric type: ${metric.dataPointType}`
            )
            break
          }
        }
      }
    }

    resultCallback({ code: 0 })
  }
}

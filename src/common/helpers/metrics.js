import {
  createMetricsLogger,
  Unit,
  StorageResolution
} from 'aws-embedded-metrics'
import { config } from '../../config.js'
import { createLogger } from './logging/logger.js'

/**
 * Sends a custom CloudWatch metric when metrics are enabled.
 *
 * @param {string} metricName Name of the metric.
 * @param {number} [value=1] Value for the metric.
 * @param {Record<string, string | number | boolean>} [dimensions={}] Metric dimensions.
 * @returns {Promise<void>} Resolves when the metric is flushed.
 */
const metricsCounter = async (metricName, value = 1, dimensions = {}) => {
  if (!config.get('isMetricsEnabled')) {
    return
  }

  try {
    const metricsLogger = createMetricsLogger()

    if (Object.keys(dimensions).length > 0) {
      const metricDimensions = Object.fromEntries(
        Object.entries(dimensions).map(([key, dimensionValue]) => [
          key,
          String(dimensionValue)
        ])
      )

      metricsLogger.putDimensions(metricDimensions)
    }

    metricsLogger.putMetric(
      metricName,
      value,
      Unit.Count,
      StorageResolution.Standard
    )
    await metricsLogger.flush()
  } catch (error) {
    createLogger().error(error, error.message)
  }
}

export { metricsCounter }

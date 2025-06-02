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
 * @returns {Promise<void>} Resolves when the metric is flushed.
 */
const metricsCounter = async (metricName, value = 1) => {
  if (!config.get('isMetricsEnabled')) {
    return
  }

  try {
    const metricsLogger = createMetricsLogger()
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

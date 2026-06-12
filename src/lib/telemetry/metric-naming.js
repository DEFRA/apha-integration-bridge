import { config } from '../../config.js'

const RENAMED_METRICS = [
  'oracledb.healthcheck.',
  'oracledb.connection.',
  'oracledb.execution.time',
  'request.latency.5XX'
]

/**
 * Applies the non-production metric naming policy.
 *
 * Metric names are returned unchanged only in the production CDP environment
 * (CDP_ENV === "prod"). Everywhere else — the lower environments, local
 * development, and when CDP_ENV is absent — the targeted metrics receive a
 * .nonprod suffix.
 *
 * @param {string} name The metric name as recorded against the meter.
 * @returns {string} The name to emit for the current environment.
 */
export function applyNonProductionMetricName(name) {
  if (!config.get('isLowerEnvironment')) {
    return name
  }

  const isRenamed = RENAMED_METRICS.some((prefix) => name.startsWith(prefix))

  if (!isRenamed) {
    return name
  }

  return `${name}.nonprod`
}

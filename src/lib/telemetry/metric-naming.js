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
 * Production naming is the default: metric names are returned unchanged unless
 * the service is explicitly flagged as running in a lower environment (CDP_ENV
 * set to a value other than "prod"), in which case the targeted metrics
 * receive a .nonprod suffix. An unset or misconfigured CDP_ENV in production
 * therefore leaves the metric names — and the alerts that target them —
 * untouched.
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

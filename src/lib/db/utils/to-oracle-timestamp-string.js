/**
 * Formats a Date object to a string compatible with Oracle's
 * TO_TIMESTAMP format mask 'yyyy-mm-dd hh24:mi:ss.ff3', using UTC components.
 *
 * @param {Date} date
 * @returns {string} e.g. '2024-01-15 14:30:00.123'
 */
export function toOracleTimestampString(date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`
}

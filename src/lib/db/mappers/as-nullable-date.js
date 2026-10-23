/**
 * @param {number} value
 * @param {number} [length=2]
 */
const pad = (value, length = 2) => String(value).padStart(length, '0')

/**
 * Formats a SAM DATE or TIMESTAMP as an RFC 3339 timestamp in UTC.
 * node-oracledb returns the stored wall-clock time as a Date in the process's
 * time zone, so its local parts are the stored value whatever that zone is.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export const asNullableTimestamp = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return null
  }

  const date = `${pad(value.getFullYear(), 4)}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
  const time = `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`

  return `${date}T${time}Z`
}

/**
 * Formats a SAM DATE as YYYY-MM-DD.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export const asNullableDate = (value) =>
  asNullableTimestamp(value)?.slice(0, 10) ?? null

import { asNullableString } from './as-nullable-string.js'

/**
 * Helper to convert 'N/A' to null, otherwise return the value as nullable string
 * @param {unknown} value
 * @returns {string | null}
 */
export const asNullableOrNAString = (value) => {
  const str = asNullableString(value)
  return str === 'N/A' ? null : str
}

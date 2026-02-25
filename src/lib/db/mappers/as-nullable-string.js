/**
 * @param {unknown} value
 * @returns {string | null}
 */
export const asNullableString = (value) => {
  if (value === null || value === undefined) {
    return null
  }

  const trimmed = String(value).trim()

  return trimmed.length > 0 ? trimmed : null
}

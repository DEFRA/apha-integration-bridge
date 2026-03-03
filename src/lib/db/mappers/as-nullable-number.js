/**
 * @param {unknown} value
 * @returns {number | null}
 */
export const asNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const number = Number(value)

  return Number.isFinite(number) ? number : null
}

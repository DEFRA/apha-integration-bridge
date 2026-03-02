/**
 * @param {unknown} value
 * @returns {boolean}
 */
export const asPreferredFlag = (value) => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value === 1
  }

  if (typeof value === 'string') {
    const normalised = value.trim().toUpperCase()

    return (
      normalised === 'Y' ||
      normalised === 'YES' ||
      normalised === 'TRUE' ||
      normalised === '1'
    )
  }

  return false
}

/**
 * obfuscates values by replacing all but the last 2 or 4 characters with asterisks.
 *
 * @param {unknown} value the value to obfuscate, if set
 */
export const obfuscate = (value) => {
  if (typeof value !== 'string') {
    return value
  }

  let visible = 2

  if (value.length > 4) {
    visible = 4
  }

  const asterisks = '*'.repeat(value.length - visible)

  const part = value.slice(-visible)

  return `${asterisks}${part}`
}

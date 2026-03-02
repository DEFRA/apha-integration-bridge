/**
 * Builds Oracle-style named placeholders and binding object from an array of values.
 *
 * @param {readonly unknown[]} values
 * @returns {{ placeholders: string, bindings: Record<string, unknown> }}
 */
export const createInClauseBindings = (values) => {
  const placeholders = values.map((_, index) => `:id${index}`).join(', ')
  const bindings = Object.fromEntries(
    values.map((value, index) => [`id${index}`, value])
  )

  return {
    placeholders,
    bindings
  }
}

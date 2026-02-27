import { asNullableString } from './as-nullable-string.js'

/**
 * @param {Record<string, unknown>} row
 * @param {string} id
 */
export const createHolding = (row, id) => {
  const localAuthority = asNullableString(row.la_name)

  const holding = {
    type: 'holdings',
    id,
    localAuthority,
    relationships: {
      location: {
        data: null
      },
      cphHolder: {
        data: null
      }
    }
  }

  return holding
}

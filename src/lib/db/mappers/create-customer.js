import { asNullableString } from './as-nullable-string.js'

/**
 * @param {Record<string, unknown>} row
 * @param {string} id
 */
export const createCustomer = (row, id) => {
  const firstName = asNullableString(row.first_name)

  const lastName = asNullableString(row.last_name)

  if (!firstName || !lastName) {
    throw new Error(
      'Expected first_name and last_name to be populated for customer records'
    )
  }

  const title = asNullableString(row.title) ?? 'Unknown'

  const middleName = asNullableString(row.second_name)

  return {
    type: 'customers',
    id,
    title,
    firstName,
    middleName,
    lastName,
    addresses: [],
    contactDetails: [],
    relationships: {
      srabpiPlants: {
        data: []
      }
    }
  }
}

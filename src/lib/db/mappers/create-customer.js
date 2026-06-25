import { mask } from '../../pii/index.js'
import { asNullableString } from './as-nullable-string.js'

/**
 * @param {Record<string, unknown>} row
 * @param {string} id
 */
export const createCustomer = (row, id) => {
  const firstName = asNullableString(row.first_name)

  const lastName = asNullableString(row.last_name)

  const title = asNullableString(row.title) ?? 'Unknown'

  const middleName = asNullableString(row.second_name)

  return {
    type: 'customers',
    id,
    title: mask(title),
    firstName: mask(firstName),
    middleName: mask(middleName),
    lastName: mask(lastName),
    addresses: [],
    contactDetails: [],
    relationships: {
      srabpiPlants: {
        data: []
      }
    }
  }
}

import { asNullableString } from './as-nullable-string.js'
import { toAddress } from './to-address.js'

/**
 * @param {Record<string, unknown>} row
 * @param {string} id
 */
export const createLocation = (row, id) => {
  const address = toAddress(row)

  // Remove isPreferred field as it's not part of the locations address schema
  if (address) {
    delete address.isPreferred
  }

  const location = {
    type: 'locations',
    id,
    name: asNullableString(row.feature_name),
    address,
    osMapReference: asNullableString(row.os_map_reference),
    livestockUnits: [],
    facilities: [],
    relationships: {
      holdings: {
        data: []
      }
    }
  }

  return location
}

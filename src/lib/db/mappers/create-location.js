import { asNullableString } from './as-nullable-string.js'

/**
 * @param {Record<string, unknown>} row
 */
const createAddress = (row) => ({
  primaryAddressableObject: {
    startNumber: row.paonstartnumber ?? null,
    startNumberSuffix: asNullableString(row.paonstartnumbersuffix),
    endNumber: row.paonendnumber ?? null,
    endNumberSuffix: asNullableString(row.paonendnumbersuffix),
    description: asNullableString(row.paondescription)
  },
  secondaryAddressableObject: {
    startNumber: row.saonstartnumber ?? null,
    startNumberSuffix: asNullableString(row.saonstartnumbersuffix),
    endNumber: row.saonendnumber ?? null,
    endNumberSuffix: asNullableString(row.saonendnumbersuffix),
    description: asNullableString(row.saondescription)
  },
  street: asNullableString(row.street),
  locality: asNullableString(row.locality),
  town: asNullableString(row.town),
  postcode: asNullableString(row.postcode),
  countryCode: asNullableString(row.countrycode)
})

/**
 * @param {Record<string, unknown>} row
 * @param {string} id
 */
export const createLocation = (row, id) => {
  const location = {
    type: 'locations',
    id,
    name: null,
    address: createAddress(row),
    osMapReference: asNullableString(row.osmapref),
    livestockUnits: [],
    facilities: [],
    relationships: {}
  }

  return location
}

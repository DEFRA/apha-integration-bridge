import { asNullableNumber } from './as-nullable-number.js'
import { asNullableString } from './as-nullable-string.js'
import { asPreferredFlag } from './as-preferred-flag.js'

/**
 * @param {Record<string, unknown>} row
 */
export const toAddress = (row) => {
  return {
    primaryAddressableObject: {
      startNumber: asNullableNumber(row.paon_start_number),
      startNumberSuffix: asNullableString(row.paon_start_number_suffix),
      endNumber: asNullableNumber(row.paon_end_number),
      endNumberSuffix: asNullableString(row.paon_end_number_suffix),
      description: asNullableString(row.paon_description)
    },
    secondaryAddressableObject: {
      startNumber: asNullableNumber(row.saon_start_number),
      startNumberSuffix: asNullableString(row.saon_start_number_suffix),
      endNumber: asNullableNumber(row.saon_end_number),
      endNumberSuffix: asNullableString(row.saon_end_number_suffix),
      description: asNullableString(row.saon_description)
    },
    street: asNullableString(row.street),
    locality: asNullableString(row.locality),
    town: asNullableString(row.town),
    postcode: asNullableString(row.postcode),
    countryCode: asNullableString(row.country_code),
    isPreferred: asPreferredFlag(row.preferred_contact_method_ind)
  }
}

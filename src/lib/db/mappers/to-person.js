import { asNullableString } from './as-nullable-string.js'
import { asPreferredFlag } from './as-preferred-flag.js'
import { createCustomer } from './create-customer.js'
import { toAddress } from './to-address.js'

/**
 * @param {Record<string, unknown>} row
 */
export const toPerson = (row) => {
  const id = asNullableString(row.party_id)

  if (!id) {
    return null
  }

  if (asNullableString(row.customer_type) !== 'PERSON') {
    throw new Error('toPerson expected a PERSON row')
  }

  const customer = createCustomer(row, id)
  const address = toAddress(row)

  if (address) {
    customer.addresses.push(address)
  }

  const details = [
    {
      type: 'email',
      value: asNullableString(row.email),
      preferred: row.email_preferred_ind
    },
    {
      type: 'mobile',
      value: asNullableString(row.mobile_number),
      preferred: row.mobile_preferred_ind
    },
    {
      type: 'landline',
      value: asNullableString(row.landline),
      preferred: row.landline_preferred_ind
    }
  ]

  for (const detail of details) {
    if (!detail.value) {
      continue
    }

    if (detail.type === 'email') {
      customer.contactDetails.push({
        type: detail.type,
        emailAddress: detail.value,
        isPreferred: asPreferredFlag(detail.preferred)
      })
    } else {
      customer.contactDetails.push({
        type: detail.type,
        phoneNumber: detail.value,
        isPreferred: asPreferredFlag(detail.preferred)
      })
    }
  }

  const plantId = asNullableString(row.srabpi_plantid)

  if (plantId) {
    customer.relationships.srabpiPlants.data.push({
      type: 'srabpi-plants',
      id: plantId
    })
  }

  return customer
}

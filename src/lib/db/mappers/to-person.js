import { asNullableString } from './as-nullable-string.js'
import { createCustomer } from './create-customer.js'
import { toAddress } from './to-address.js'

/**
 * Contact details are added later by toCustomer.
 *
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

  const plantId = asNullableString(row.srabpi_plantid)

  if (plantId) {
    customer.relationships.srabpiPlants.data.push({
      type: 'srabpi-plants',
      id: plantId
    })
  }

  return customer
}

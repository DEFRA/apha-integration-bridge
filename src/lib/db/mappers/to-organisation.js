import { asNullableString } from './as-nullable-string.js'
import { createOrganisation } from './create-organisation.js'
import { toAddress } from './to-address.js'

/**
 * @param {Record<string, unknown>} row
 */
export const toOrganisation = (row) => {
  const id = asNullableString(row.party_id)

  if (!id) {
    return null
  }

  if (asNullableString(row.customer_type) !== 'ORGANISATION') {
    throw new Error('toOrganisation expected an ORGANISATION row')
  }

  const organisation = createOrganisation(row, id)
  const address = toAddress(row)

  if (address) {
    const organisationAddress = { ...address }

    delete organisationAddress.isPreferred

    organisation.address = organisationAddress
  }

  const phoneNumber =
    asNullableString(row.mobile_number) ?? asNullableString(row.landline)

  if (phoneNumber) {
    organisation.contactDetails.primaryContact.phoneNumber = phoneNumber
  }

  const secondaryEmail = asNullableString(row.email)

  if (secondaryEmail) {
    organisation.contactDetails.secondaryContact.emailAddress = secondaryEmail
  }

  const plantId = asNullableString(row.srabpi_plantid)

  if (plantId) {
    organisation.relationships.srabpiPlants.data.push({
      type: 'srabpi-plants',
      id: plantId
    })
  }

  return organisation
}

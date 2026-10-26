import { asNullableString } from './as-nullable-string.js'
import { createOrganisation } from './create-organisation.js'
import { toAddress } from './to-address.js'

const emptyAddress = () => ({
  primaryAddressableObject: {
    startNumber: null,
    startNumberSuffix: null,
    endNumber: null,
    endNumberSuffix: null,
    description: null
  },
  secondaryAddressableObject: {
    startNumber: null,
    startNumberSuffix: null,
    endNumber: null,
    endNumberSuffix: null,
    description: null
  },
  street: null,
  locality: null,
  town: null,
  county: null,
  postcode: null,
  countryCode: null
})

/**
 * Contact phone and email are added later by toOrganisationDetails.
 *
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
  } else {
    organisation.address = emptyAddress()
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

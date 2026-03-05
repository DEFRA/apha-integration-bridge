import { asNullableString } from './as-nullable-string.js'

/**
 * @param {Record<string, unknown>} row
 * @param {string} id
 */
export const createOrganisation = (row, id) => {
  const organisationName = asNullableString(row.organisation_name)

  if (!organisationName) {
    throw new Error(
      'Expected organisation_name to be populated for organisation records'
    )
  }

  return {
    type: 'organisations',
    id,
    organisationName,
    address: null,
    contactDetails: {
      primaryContact: {
        fullName: asNullableString(row.primary_contact_full_name),
        emailAddress: null,
        phoneNumber: null
      },
      secondaryContact: {
        fullName: asNullableString(row.secondary_contact_full_name),
        emailAddress: null,
        phoneNumber: null
      }
    },
    relationships: {
      srabpiPlants: {
        data: []
      }
    }
  }
}

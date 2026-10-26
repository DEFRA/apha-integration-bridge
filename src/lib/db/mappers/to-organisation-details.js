import { mask } from '../../pii/index.js'
import { asNullableString } from './as-nullable-string.js'
import { toContactMethods } from './to-contact-methods.js'
import { toPartyRoles } from './to-party-role.js'

/**
 * @typedef {ReturnType<typeof import('./create-organisation.js').createOrganisation>} Organisation
 */

/**
 * Returns the first contact value of the given type held directly by the
 * organisation (not through a role).
 *
 * @param {Record<string, unknown>[]} contacts find-party-contacts.sql rows
 * @param {string} telecomAddressType
 * @returns {string | null}
 */
const firstOwnContactValue = (contacts, telecomAddressType) => {
  for (const contact of contacts) {
    const isOwnContact =
      contact.party_role_pk === null || contact.party_role_pk === undefined

    if (!isOwnContact) {
      continue
    }

    if (contact.telecom_address_type !== telecomAddressType) {
      continue
    }

    const value = asNullableString(contact.contact_value)

    if (value) {
      return value
    }
  }

  return null
}

/**
 * Adds organisation type, roles and contact methods to an organisation.
 * contactDetails keeps its existing rule: the primary contact gets the first
 * mobile (or landline) and the secondary contact gets the first email.
 *
 * @param {Organisation} organisation
 * @param {{
 *   contacts: Record<string, unknown>[],
 *   roles: Record<string, unknown>[],
 *   attributes: Record<string, unknown> | undefined
 * }} partyRows
 */
export const toOrganisationDetails = (organisation, partyRows) => {
  let organisationType = null

  if (partyRows.attributes) {
    organisationType = asNullableString(partyRows.attributes.organisation_type)
  }

  let primaryContactPhoneNumber = firstOwnContactValue(
    partyRows.contacts,
    'MOBILE'
  )

  if (!primaryContactPhoneNumber) {
    primaryContactPhoneNumber = firstOwnContactValue(
      partyRows.contacts,
      'LANDLINE'
    )
  }

  const secondaryContactEmailAddress = firstOwnContactValue(
    partyRows.contacts,
    'EMAIL'
  )

  return {
    type: organisation.type,
    id: organisation.id,
    organisationName: organisation.organisationName,
    organisationType,
    address: organisation.address,
    contactDetails: {
      primaryContact: {
        fullName: organisation.contactDetails.primaryContact.fullName,
        emailAddress: null,
        phoneNumber: mask(primaryContactPhoneNumber)
      },
      secondaryContact: {
        fullName: organisation.contactDetails.secondaryContact.fullName,
        emailAddress: mask(secondaryContactEmailAddress),
        phoneNumber: null
      }
    },
    contactMethods: toContactMethods(partyRows.contacts),
    roles: toPartyRoles(partyRows.roles),
    relationships: organisation.relationships
  }
}

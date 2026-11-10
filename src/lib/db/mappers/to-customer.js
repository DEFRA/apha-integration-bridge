import { toContactMethods } from './to-contact-methods.js'
import { toPartyRoles } from './to-party-role.js'

/**
 * @typedef {ReturnType<typeof import('./create-customer.js').createCustomer>} Person
 */

/**
 * @param {Record<string, unknown>[]} rows find-party-organisations.sql rows
 */
const toOrganisationRelationships = (rows) => {
  const data = []

  for (const row of rows) {
    data.push({ type: 'organisations', id: String(row.organisation_id) })
  }

  return { data }
}

/**
 * Adds party type, roles, contact details and related organisations to a
 * person.
 *
 * @param {Person} person
 * @param {{
 *   contacts: Record<string, unknown>[],
 *   roles: Record<string, unknown>[],
 *   organisations: Record<string, unknown>[]
 * }} partyRows
 */
export const toCustomer = (person, partyRows) => {
  return {
    type: person.type,
    id: person.id,
    partyType: 'PERSON',
    title: person.title,
    firstName: person.firstName,
    middleName: person.middleName,
    lastName: person.lastName,
    addresses: person.addresses,
    contactDetails: toContactMethods(partyRows.contacts),
    roles: toPartyRoles(partyRows.roles),
    relationships: {
      ...person.relationships,
      organisations: toOrganisationRelationships(partyRows.organisations)
    }
  }
}

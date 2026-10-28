import { toContactMethods } from './to-contact-methods.js'
import { toPartyRoles } from './to-party-role.js'

/**
 * @typedef {ReturnType<typeof import('./create-customer.js').createCustomer>} Person
 */

/**
 * Adds party type, roles and contact details to a person.
 *
 * @param {Person} person
 * @param {{
 *   contacts: Record<string, unknown>[],
 *   roles: Record<string, unknown>[]
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
    relationships: person.relationships
  }
}

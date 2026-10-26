import { expect, test } from '@jest/globals'

import { runWithMaskingContext } from '../../pii/index.js'
import { toOrganisation } from './to-organisation.js'
import { toOrganisationDetails } from './to-organisation-details.js'

const organisationRow = {
  party_id: 'O123456',
  customer_type: 'ORGANISATION',
  organisation_name: 'Farming Ltd',
  primary_contact_full_name: 'Bob Farmer',
  secondary_contact_full_name: 'Roberta Farmer',
  srabpi_plantid: null
}

/**
 * @param {string} type
 * @param {string} value
 * @param {number | null} [partyRoleKey]
 */
const contactRow = (type, value, partyRoleKey = null) => ({
  telecom_address_type: type,
  contact_value: value,
  address_usage_type: null,
  preferred_contact_method_ind: null,
  party_role_pk: partyRoleKey
})

/**
 * @param {Record<string, unknown>[]} contacts
 * @param {Record<string, unknown>} [attributes]
 */
const detailsOf = (contacts, attributes) => {
  const organisation = toOrganisation(organisationRow)

  if (!organisation) {
    throw new Error('expected the fixture row to map to an organisation')
  }

  return toOrganisationDetails(organisation, {
    contacts,
    roles: [],
    attributes
  })
}

test('uses the first mobile and first email for the named contacts', () => {
  const details = detailsOf([
    contactRow('LANDLINE', '01234 000001'),
    contactRow('MOBILE', '07700 900001'),
    contactRow('MOBILE', '07700 900002'),
    contactRow('EMAIL', 'first@example.com'),
    contactRow('EMAIL', 'second@example.com')
  ])

  expect(details.contactDetails).toEqual({
    primaryContact: {
      fullName: 'Bob Farmer',
      emailAddress: null,
      phoneNumber: '07700 900001'
    },
    secondaryContact: {
      fullName: 'Roberta Farmer',
      emailAddress: 'first@example.com',
      phoneNumber: null
    }
  })
})

test('falls back to the landline when there is no mobile', () => {
  const details = detailsOf([contactRow('LANDLINE', '01234 000001')])

  expect(details.contactDetails.primaryContact.phoneNumber).toBe('01234 000001')
})

test('ignores contacts held through a role for the named contacts', () => {
  const details = detailsOf([
    contactRow('MOBILE', '07700 900001', 101),
    contactRow('EMAIL', 'role@example.com', 101)
  ])

  expect(details.contactDetails.primaryContact.phoneNumber).toBeNull()
  expect(details.contactDetails.secondaryContact.emailAddress).toBeNull()
  expect(details.contactMethods).toHaveLength(2)
})

test('masks the named contacts phone and email', () => {
  const details = runWithMaskingContext({ shouldMask: true }, () =>
    detailsOf([
      contactRow('LANDLINE', '02012345678'),
      contactRow('EMAIL', 'org@example.com')
    ])
  )

  expect(details.contactDetails.primaryContact.phoneNumber).toBe('0*********8')
  expect(details.contactDetails.secondaryContact.emailAddress).toBe(
    'o*************m'
  )
})

import { expect, test } from '@jest/globals'

import { runWithMaskingContext } from '../../pii/index.js'
import { toOrganisation } from './to-organisation.js'

test('toOrganisation returns null when party id is missing', () => {
  expect(
    toOrganisation({
      party_id: null
    })
  ).toBeNull()
})

test('toOrganisation maps a single row into one organisation resource', () => {
  const organisation = toOrganisation({
    party_id: 'O123456',
    customer_type: 'ORGANISATION',
    organisation_name: 'Farming Ltd',
    primary_contact_full_name: 'Bob Farmer',
    secondary_contact_full_name: 'Roberta Farmer',
    paon_start_number: 12,
    paon_start_number_suffix: null,
    paon_end_number: null,
    paon_end_number_suffix: null,
    paon_description: 'Rose cottage',
    saon_start_number: 12,
    saon_start_number_suffix: null,
    saon_end_number: null,
    saon_end_number_suffix: null,
    saon_description: null,
    street: 'Street',
    locality: null,
    town: 'Town',
    county: 'Devon',
    postcode: '1AA A11',
    uk_internal_code: 'ENG',
    country_code: 'GB',
    preferred_contact_method_ind: null,
    email: 'example@example.com',
    mobile_number: null,
    landline: '+44 1111 11111',
    srabpi_plantid: 'SP123456'
  })

  expect(organisation).toEqual({
    type: 'organisations',
    id: 'O123456',
    organisationName: 'Farming Ltd',
    address: {
      primaryAddressableObject: {
        startNumber: 12,
        startNumberSuffix: null,
        endNumber: null,
        endNumberSuffix: null,
        description: 'Rose cottage'
      },
      secondaryAddressableObject: {
        startNumber: 12,
        startNumberSuffix: null,
        endNumber: null,
        endNumberSuffix: null,
        description: null
      },
      street: 'Street',
      locality: null,
      town: 'Town',
      county: 'Devon',
      postcode: '1AA A11',
      countryCode: 'ENG'
    },
    contactDetails: {
      primaryContact: {
        fullName: 'Bob Farmer',
        emailAddress: null,
        phoneNumber: '+44 1111 11111'
      },
      secondaryContact: {
        fullName: 'Roberta Farmer',
        emailAddress: 'example@example.com',
        phoneNumber: null
      }
    },
    relationships: {
      srabpiPlants: {
        data: [
          {
            type: 'srabpi-plants',
            id: 'SP123456'
          }
        ]
      }
    }
  })
})

test('toOrganisation emits a full address object when address fields are empty', () => {
  const organisation = toOrganisation({
    party_id: 'O987654',
    customer_type: 'ORGANISATION',
    organisation_name: 'No Address Ltd',
    primary_contact_full_name: 'Jane Contact',
    secondary_contact_full_name: null,
    paon_start_number: null,
    paon_start_number_suffix: null,
    paon_end_number: null,
    paon_end_number_suffix: null,
    paon_description: null,
    saon_start_number: null,
    saon_start_number_suffix: null,
    saon_end_number: null,
    saon_end_number_suffix: null,
    saon_description: null,
    street: null,
    locality: null,
    town: null,
    postcode: null,
    country_code: null,
    preferred_contact_method_ind: null,
    email: null,
    mobile_number: null,
    landline: null,
    srabpi_plantid: null
  })

  expect(organisation).toEqual({
    type: 'organisations',
    id: 'O987654',
    organisationName: 'No Address Ltd',
    address: {
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
    },
    contactDetails: {
      primaryContact: {
        fullName: 'Jane Contact',
        emailAddress: null,
        phoneNumber: null
      },
      secondaryContact: {
        fullName: null,
        emailAddress: null,
        phoneNumber: null
      }
    },
    relationships: {
      srabpiPlants: {
        data: []
      }
    }
  })
})

test('toOrganisation masks names, address, primary phone and secondary email when masking context is active', () => {
  runWithMaskingContext({ shouldMask: true }, () => {
    const organisation = toOrganisation({
      party_id: 'O123456',
      customer_type: 'ORGANISATION',
      organisation_name: 'Farming Ltd',
      primary_contact_full_name: 'Bob Farmer',
      secondary_contact_full_name: 'Roberta Farmer',
      paon_start_number: null,
      paon_start_number_suffix: null,
      paon_end_number: null,
      paon_end_number_suffix: null,
      paon_description: null,
      saon_start_number: null,
      saon_start_number_suffix: null,
      saon_end_number: null,
      saon_end_number_suffix: null,
      saon_description: null,
      street: 'Acacia Avenue',
      locality: null,
      town: 'Town',
      county: 'Devon',
      postcode: 'SW1A 1AA',
      uk_internal_code: 'GB',
      preferred_contact_method_ind: null,
      email: 'org@example.com',
      mobile_number: null,
      landline: '02012345678',
      srabpi_plantid: null
    })

    expect(organisation.organisationName).toBe('F*********d')
    expect(organisation.contactDetails.primaryContact.fullName).toBe(
      'B********r'
    )
    expect(organisation.contactDetails.secondaryContact.fullName).toBe(
      'R************r'
    )
    expect(organisation.contactDetails.primaryContact.phoneNumber).toBe(
      '0*********8'
    )
    expect(organisation.contactDetails.secondaryContact.emailAddress).toBe(
      'o*************m'
    )
    expect(organisation.address).toMatchObject({
      street: 'A***********e',
      town: '****',
      county: '*****',
      postcode: 'S******A',
      countryCode: 'GB'
    })
  })
})

test('toOrganisation throws when row customer_type is PERSON', () => {
  expect(() =>
    toOrganisation({
      party_id: 'O123456',
      customer_type: 'PERSON',
      organisation_name: 'Farming Ltd',
      primary_contact_full_name: 'Bob Farmer',
      secondary_contact_full_name: null,
      paon_start_number: null,
      paon_start_number_suffix: null,
      paon_end_number: null,
      paon_end_number_suffix: null,
      paon_description: null,
      saon_start_number: null,
      saon_start_number_suffix: null,
      saon_end_number: null,
      saon_end_number_suffix: null,
      saon_description: null,
      street: null,
      locality: null,
      town: null,
      postcode: null,
      country_code: null,
      preferred_contact_method_ind: null,
      email: null,
      mobile_number: null,
      landline: null,
      srabpi_plantid: null
    })
  ).toThrow(/organisation/i)
})

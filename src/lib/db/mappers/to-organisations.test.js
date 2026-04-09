import { expect, test } from '@jest/globals'

import { toOrganisations } from './to-organisations.js'

test('toOrganisations maps rows and preserves requested id order', () => {
  const rows = [
    {
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
    },
    {
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
    },
    {
      party_id: 'O234567',
      customer_type: 'ORGANISATION',
      organisation_name: 'Soil testing lab',
      primary_contact_full_name: 'Sally Scientist',
      secondary_contact_full_name: null,
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
      county: 'South Lanarkshire',
      postcode: '1AA A11',
      uk_internal_code: 'SCT',
      country_code: 'GB',
      preferred_contact_method_ind: null,
      email: null,
      mobile_number: null,
      landline: '+44 1111 11111',
      srabpi_plantid: null
    }
  ]

  const organisations = toOrganisations(rows, ['O234567', 'O123456'])

  expect(organisations).toEqual([
    {
      type: 'organisations',
      id: 'O234567',
      organisationName: 'Soil testing lab',
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
        county: 'South Lanarkshire',
        postcode: '1AA A11',
        countryCode: 'SCT'
      },
      contactDetails: {
        primaryContact: {
          fullName: 'Sally Scientist',
          emailAddress: null,
          phoneNumber: '+44 1111 11111'
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
    },
    {
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
    }
  ])
})

import { expect, test } from '@jest/globals'

import { toPeople } from './to-people.js'

test('toPeople maps rows and preserves requested id order', () => {
  const rows = [
    {
      party_id: 'C123456',
      customer_type: 'PERSON',
      title: 'Mr',
      first_name: 'Bert',
      second_name: null,
      last_name: 'Farmer',
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
      postcode: '1AA A11',
      country_code: null,
      preferred_contact_method_ind: 'N',
      email: 'example@example.com',
      email_preferred_ind: 'N',
      mobile_number: '+44 11111 11111',
      mobile_preferred_ind: 'Y',
      landline: null,
      landline_preferred_ind: null,
      srabpi_plantid: 'PLANT-A'
    },
    {
      party_id: 'C123456',
      customer_type: 'PERSON',
      title: 'Mr',
      first_name: 'Bert',
      second_name: null,
      last_name: 'Farmer',
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
      postcode: '1AA A11',
      country_code: null,
      preferred_contact_method_ind: 'N',
      email: 'example@example.com',
      email_preferred_ind: 'N',
      mobile_number: '+44 11111 11111',
      mobile_preferred_ind: 'Y',
      landline: null,
      landline_preferred_ind: null,
      srabpi_plantid: 'PLANT-A'
    },
    {
      party_id: 'C234567',
      customer_type: 'PERSON',
      title: 'Mrs',
      first_name: 'Roberta',
      second_name: null,
      last_name: 'Farmer',
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
      email_preferred_ind: null,
      mobile_number: null,
      mobile_preferred_ind: null,
      landline: '+44 1111 11111',
      landline_preferred_ind: 'Y',
      srabpi_plantid: null
    }
  ]

  const customers = toPeople(rows, ['C234567', 'C123456'])

  expect(customers).toEqual([
    {
      type: 'customers',
      id: 'C234567',
      title: 'Mrs',
      firstName: 'Roberta',
      middleName: null,
      lastName: 'Farmer',
      addresses: [
        {
          countryCode: null,
          isPreferred: false,
          locality: null,
          postcode: null,
          primaryAddressableObject: {
            description: null,
            endNumber: null,
            endNumberSuffix: null,
            startNumber: null,
            startNumberSuffix: null
          },
          secondaryAddressableObject: {
            description: null,
            endNumber: null,
            endNumberSuffix: null,
            startNumber: null,
            startNumberSuffix: null
          },
          street: null,
          town: null
        }
      ],
      contactDetails: [
        {
          type: 'landline',
          phoneNumber: '+44 1111 11111',
          isPreferred: true
        }
      ],
      relationships: {
        srabpiPlants: {
          data: []
        }
      }
    },
    {
      type: 'customers',
      id: 'C123456',
      title: 'Mr',
      firstName: 'Bert',
      middleName: null,
      lastName: 'Farmer',
      addresses: [
        {
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
          postcode: '1AA A11',
          countryCode: null,
          isPreferred: false
        }
      ],
      contactDetails: [
        {
          type: 'email',
          emailAddress: 'example@example.com',
          isPreferred: false
        },
        {
          type: 'mobile',
          phoneNumber: '+44 11111 11111',
          isPreferred: true
        }
      ],
      relationships: {
        srabpiPlants: {
          data: [
            {
              type: 'srabpi-plants',
              id: 'PLANT-A'
            }
          ]
        }
      }
    }
  ])
})

test('toPeople aggregates multiple srabpiPlants from rows with same party_id', () => {
  const rows = [
    {
      party_id: 'C123456',
      customer_type: 'PERSON',
      title: 'Mr',
      first_name: 'John',
      second_name: null,
      last_name: 'Smith',
      paon_start_number: 10,
      paon_start_number_suffix: null,
      paon_end_number: null,
      paon_end_number_suffix: null,
      paon_description: 'Main House',
      saon_start_number: null,
      saon_start_number_suffix: null,
      saon_end_number: null,
      saon_end_number_suffix: null,
      saon_description: null,
      street: 'High Street',
      locality: null,
      town: 'London',
      postcode: 'SW1A 1AA',
      country_code: null,
      preferred_contact_method_ind: 'Y',
      email: 'john@example.com',
      email_preferred_ind: 'Y',
      mobile_number: null,
      mobile_preferred_ind: null,
      landline: null,
      landline_preferred_ind: null,
      srabpi_plantid: 'PLANT-A'
    },
    {
      party_id: 'C123456',
      customer_type: 'PERSON',
      title: 'Mr',
      first_name: 'John',
      second_name: null,
      last_name: 'Smith',
      paon_start_number: 10,
      paon_start_number_suffix: null,
      paon_end_number: null,
      paon_end_number_suffix: null,
      paon_description: 'Main House',
      saon_start_number: null,
      saon_start_number_suffix: null,
      saon_end_number: null,
      saon_end_number_suffix: null,
      saon_description: null,
      street: 'High Street',
      locality: null,
      town: 'London',
      postcode: 'SW1A 1AA',
      country_code: null,
      preferred_contact_method_ind: 'Y',
      email: 'john@example.com',
      email_preferred_ind: 'Y',
      mobile_number: null,
      mobile_preferred_ind: null,
      landline: null,
      landline_preferred_ind: null,
      srabpi_plantid: 'PLANT-B'
    },
    {
      party_id: 'C123456',
      customer_type: 'PERSON',
      title: 'Mr',
      first_name: 'John',
      second_name: null,
      last_name: 'Smith',
      paon_start_number: 10,
      paon_start_number_suffix: null,
      paon_end_number: null,
      paon_end_number_suffix: null,
      paon_description: 'Main House',
      saon_start_number: null,
      saon_start_number_suffix: null,
      saon_end_number: null,
      saon_end_number_suffix: null,
      saon_description: null,
      street: 'High Street',
      locality: null,
      town: 'London',
      postcode: 'SW1A 1AA',
      country_code: null,
      preferred_contact_method_ind: 'Y',
      email: 'john@example.com',
      email_preferred_ind: 'Y',
      mobile_number: null,
      mobile_preferred_ind: null,
      landline: null,
      landline_preferred_ind: null,
      srabpi_plantid: 'PLANT-C'
    }
  ]

  const customers = toPeople(rows, ['C123456'])

  expect(customers).toEqual([
    {
      type: 'customers',
      id: 'C123456',
      title: 'Mr',
      firstName: 'John',
      middleName: null,
      lastName: 'Smith',
      addresses: [
        {
          primaryAddressableObject: {
            startNumber: 10,
            startNumberSuffix: null,
            endNumber: null,
            endNumberSuffix: null,
            description: 'Main House'
          },
          secondaryAddressableObject: {
            startNumber: null,
            startNumberSuffix: null,
            endNumber: null,
            endNumberSuffix: null,
            description: null
          },
          street: 'High Street',
          locality: null,
          town: 'London',
          postcode: 'SW1A 1AA',
          countryCode: null,
          isPreferred: true
        }
      ],
      contactDetails: [
        {
          type: 'email',
          emailAddress: 'john@example.com',
          isPreferred: true
        }
      ],
      relationships: {
        srabpiPlants: {
          data: [
            {
              type: 'srabpi-plants',
              id: 'PLANT-A'
            },
            {
              type: 'srabpi-plants',
              id: 'PLANT-B'
            },
            {
              type: 'srabpi-plants',
              id: 'PLANT-C'
            }
          ]
        }
      }
    }
  ])
})

import { expect, test } from '@jest/globals'

import { runWithMaskingContext } from '../../pii/index.js'
import { toPerson } from './to-person.js'

test('toPerson returns null when party id is missing', () => {
  expect(
    toPerson({
      party_id: null
    })
  ).toBeNull()
})

test('toPerson maps a single row into one customer resource', () => {
  const customer = toPerson({
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
    county: 'Devon',
    postcode: '1AA A11',
    uk_internal_code: 'ENG',
    country_code: null,
    preferred_contact_method_ind: 'N',
    srabpi_plantid: 'PLANT-A'
  })

  expect(customer).toEqual({
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
        county: 'Devon',
        postcode: '1AA A11',
        countryCode: 'ENG',
        isPreferred: false
      }
    ],
    // contacts come from find-party-contacts.sql; toCustomer adds them
    contactDetails: [],
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
  })
})

test('toPerson masks names and address when masking context is active', () => {
  runWithMaskingContext({ shouldMask: true }, () => {
    const customer = toPerson({
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
      preferred_contact_method_ind: 'N',
      srabpi_plantid: null
    })

    expect(customer).toMatchObject({
      title: '**',
      firstName: '****',
      lastName: 'F****r',
      addresses: [
        expect.objectContaining({
          street: 'A***********e',
          town: '****',
          county: '*****',
          postcode: 'S******A',
          countryCode: 'GB'
        })
      ]
    })
  })
})

test('toPerson throws when row customer_type is ORGANISATION', () => {
  expect(() =>
    toPerson({
      party_id: 'C123456',
      customer_type: 'ORGANISATION',
      title: 'Mr',
      first_name: 'Bert',
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
      srabpi_plantid: null
    })
  ).toThrow(/person/i)
})

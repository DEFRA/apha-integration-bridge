import { expect, test } from '@jest/globals'

import { runWithMaskingContext } from '../../pii/index.js'
import { toAddress } from './to-address.js'

test('toAddress still returns full address object even when no address fields are populated', () => {
  expect(
    toAddress({
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
      country_code: null
    })
  ).toEqual({
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
    countryCode: null,
    isPreferred: false
  })
})

test('toAddress maps populated fields to API address shape', () => {
  expect(
    toAddress({
      paon_start_number: '12',
      paon_start_number_suffix: null,
      paon_end_number: null,
      paon_end_number_suffix: null,
      paon_description: 'Rose cottage',
      saon_start_number: '12',
      saon_start_number_suffix: null,
      saon_end_number: null,
      saon_end_number_suffix: null,
      saon_description: null,
      street: 'Street',
      locality: null,
      town: 'Town',
      county: 'Devon',
      postcode: '1AA A11',
      country_code: null,
      preferred_contact_method_ind: 'N'
    })
  ).toEqual({
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
    countryCode: null,
    isPreferred: false
  })
})

test('toAddress masks address line fields and postcode but leaves countryCode and addressable-object numbers unchanged', () => {
  runWithMaskingContext({ shouldMask: true }, () => {
    const address = toAddress({
      paon_start_number: '12',
      paon_start_number_suffix: 'A',
      paon_end_number: null,
      paon_end_number_suffix: null,
      paon_description: 'Rose cottage',
      saon_start_number: null,
      saon_start_number_suffix: null,
      saon_end_number: null,
      saon_end_number_suffix: null,
      saon_description: null,
      street: 'Acacia Avenue',
      locality: 'West Side',
      town: 'Town',
      county: 'Devon',
      postcode: 'SW1A 1AA',
      uk_internal_code: 'GB',
      preferred_contact_method_ind: 'N'
    })

    expect(address.street).toBe('A***********e')
    expect(address.locality).toBe('W*******e')
    expect(address.town).toBe('****')
    expect(address.county).toBe('*****')
    expect(address.postcode).toBe('S******A')
    expect(address.countryCode).toBe('GB')
    expect(address.primaryAddressableObject).toEqual({
      startNumber: 12,
      startNumberSuffix: 'A',
      endNumber: null,
      endNumberSuffix: null,
      description: 'Rose cottage'
    })
  })
})

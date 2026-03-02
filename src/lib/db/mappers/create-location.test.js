import { expect, test } from '@jest/globals'

import { createLocation } from './create-location.js'

test('createLocation maps a location row into the location response skeleton', () => {
  const location = createLocation(
    {
      paonstartnumber: 123,
      paonstartnumbersuffix: 'A',
      street: 'Main Street',
      town: 'London',
      postcode: 'SW1A 1AA',
      countrycode: 'GB',
      osmapref: 'TQ123456'
    },
    'L97339'
  )

  expect(location).toEqual({
    type: 'locations',
    id: 'L97339',
    name: null,
    address: {
      primaryAddressableObject: {
        startNumber: 123,
        startNumberSuffix: 'A',
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
      street: 'Main Street',
      locality: null,
      town: 'London',
      postcode: 'SW1A 1AA',
      countryCode: 'GB'
    },
    osMapReference: 'TQ123456',
    livestockUnits: [],
    facilities: [],
    relationships: {}
  })
})

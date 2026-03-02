import { expect, test } from '@jest/globals'

import { toLocations } from './to-locations.js'

test('toLocations returns locations ordered by requested ids', () => {
  const rows = [
    {
      location_id: 'L97340',
      osmapref: 'TQ987654',
      street: 'Second Street',
      town: 'Manchester',
      postcode: 'M1 1AA',
      countrycode: 'GB'
    },
    {
      location_id: 'L97339',
      osmapref: 'TQ123456',
      street: 'Main Street',
      town: 'London',
      postcode: 'SW1A 1AA',
      countrycode: 'GB'
    }
  ]

  const locations = toLocations(rows, ['L97339', 'L97340'])

  expect(locations).toHaveLength(2)
  expect(locations[0].id).toBe('L97339')
  expect(locations[1].id).toBe('L97340')
})

test('toLocations accumulates livestock units and facilities for a location', () => {
  const rows = [
    {
      location_id: 'L97339',
      osmapref: 'TQ123456',
      street: 'Main Street',
      town: 'London',
      postcode: 'SW1A 1AA',
      countrycode: 'GB',
      unitid: '1001',
      unittype: 'LU',
      usualquantity: 50
    },
    {
      location_id: 'L97339',
      osmapref: 'TQ123456',
      street: 'Main Street',
      town: 'London',
      postcode: 'SW1A 1AA',
      countrycode: 'GB',
      unitid: '2001',
      unittype: 'F'
    },
    {
      location_id: 'L97339',
      osmapref: 'TQ123456',
      street: 'Main Street',
      town: 'London',
      postcode: 'SW1A 1AA',
      countrycode: 'GB',
      unitid: '1002',
      unittype: 'LU',
      usualquantity: 25
    }
  ]

  const locations = toLocations(rows, ['L97339'])

  expect(locations).toHaveLength(1)
  expect(locations[0].livestockUnits).toHaveLength(2)
  expect(locations[0].livestockUnits[0]).toEqual({
    type: 'animal-commodities',
    id: '1001',
    animalQuantities: 50,
    species: null
  })
  expect(locations[0].livestockUnits[1]).toEqual({
    type: 'animal-commodities',
    id: '1002',
    animalQuantities: 25,
    species: null
  })
  expect(locations[0].facilities).toHaveLength(1)
  expect(locations[0].facilities[0]).toEqual({
    type: 'facilities',
    id: '2001',
    name: null,
    facilityType: null,
    businessActivity: null
  })
})

test('toLocations ignores rows with invalid location ids', () => {
  const rows = [
    {
      location_id: 'L97339',
      osmapref: 'TQ123456',
      street: 'Main Street',
      town: 'London'
    },
    {
      location_id: '   ',
      osmapref: 'Invalid',
      street: 'Invalid Street',
      town: 'Invalid'
    },
    {
      location_id: null,
      osmapref: 'Null',
      street: 'Null Street',
      town: 'Null'
    }
  ]

  const locations = toLocations(rows, ['L97339', 'L99999'])

  expect(locations).toHaveLength(1)
  expect(locations[0].id).toBe('L97339')
})

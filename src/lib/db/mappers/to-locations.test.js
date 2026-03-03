import { expect, test } from '@jest/globals'

import { toLocations } from './to-locations.js'

test('toLocations returns locations ordered by requested ids', () => {
  const rows = [
    {
      location_id: 'L97340',
      os_map_reference: 'TQ987654',
      street: 'Second Street',
      town: 'Manchester',
      postcode: 'M1 1AA',
      country_code: 'GB'
    },
    {
      location_id: 'L97339',
      os_map_reference: 'TQ123456',
      street: 'Main Street',
      town: 'London',
      postcode: 'SW1A 1AA',
      country_code: 'GB'
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
      os_map_reference: 'TQ123456',
      street: 'Main Street',
      town: 'London',
      postcode: 'SW1A 1AA',
      country_code: 'GB',
      unit_id: '1001',
      unit_type: 'LU',
      usual_quantity_of_animals: 50
    },
    {
      location_id: 'L97339',
      os_map_reference: 'TQ123456',
      street: 'Main Street',
      town: 'London',
      postcode: 'SW1A 1AA',
      country_code: 'GB',
      unit_id: '2001',
      unit_type: 'F'
    },
    {
      location_id: 'L97339',
      os_map_reference: 'TQ123456',
      street: 'Main Street',
      town: 'London',
      postcode: 'SW1A 1AA',
      country_code: 'GB',
      unit_id: '1002',
      unit_type: 'LU',
      usual_quantity_of_animals: 25
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
      os_map_reference: 'TQ123456',
      street: 'Main Street',
      town: 'London'
    },
    {
      location_id: '   ',
      os_map_reference: 'Invalid',
      street: 'Invalid Street',
      town: 'Invalid'
    },
    {
      location_id: null,
      os_map_reference: 'Null',
      street: 'Null Street',
      town: 'Null'
    }
  ]

  const locations = toLocations(rows, ['L97339', 'L99999'])

  expect(locations).toHaveLength(1)
  expect(locations[0].id).toBe('L97339')
})

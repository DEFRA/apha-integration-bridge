import { expect, test } from '@jest/globals'

import { toHolding } from './to-holding.js'

test('toHolding returns null when cph_id is missing', () => {
  const holding = toHolding({
    cph_id: '   ',
    la_name: 'LA name 001',
    location_id: 'LOC-001',
    party_id: 'PARTY-001'
  })

  expect(holding).toBeNull()
})

test('toHolding maps base holding and relationship identifiers', () => {
  const holding = toHolding({
    cph_id: '11/111/1111',
    la_name: 'LA name 001',
    location_id: 'LOC-001',
    party_id: 'PARTY-001'
  })

  expect(holding).toEqual({
    type: 'holdings',
    id: '11/111/1111',
    localAuthority: 'LA name 001',
    relationships: {
      location: {
        data: {
          type: 'locations',
          id: 'LOC-001'
        }
      },
      cphHolder: {
        data: {
          type: 'customers',
          id: 'PARTY-001'
        }
      }
    }
  })
})

test('toHolding keeps relationship data as null when optional ids are not present', () => {
  const holding = toHolding({
    cph_id: '22/222/2222',
    la_name: null,
    location_id: '   ',
    party_id: undefined
  })

  expect(holding).toEqual({
    type: 'holdings',
    id: '22/222/2222',
    localAuthority: null,
    relationships: {
      location: {
        data: null
      },
      cphHolder: {
        data: null
      }
    }
  })
})

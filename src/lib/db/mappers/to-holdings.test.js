import { expect, test } from '@jest/globals'

import { toHoldings } from './to-holdings.js'

test('toHoldings returns holdings ordered by requested ids', () => {
  const rows = [
    {
      cph_id: '22/222/2222',
      la_name: 'Authority 22',
      location_id: 'LOC-22',
      party_id: 'PARTY-22'
    },
    {
      cph_id: '11/111/1111',
      la_name: 'Authority 11',
      location_id: 'LOC-11',
      party_id: 'PARTY-11'
    }
  ]

  const holdings = toHoldings(rows, ['11/111/1111', '22/222/2222'])

  expect(holdings).toHaveLength(2)
  expect(holdings[0].id).toBe('11/111/1111')
  expect(holdings[1].id).toBe('22/222/2222')
})

test('toHoldings ignores rows that cannot be mapped and keeps first mapped value per id', () => {
  const rows = [
    {
      cph_id: '11/111/1111',
      la_name: 'LA name 001',
      location_id: 'LOC-11-A',
      party_id: 'PARTY-11-A'
    },
    {
      cph_id: '11/111/1111',
      la_name: 'LA name 002',
      location_id: 'LOC-11-B',
      party_id: 'PARTY-11-B'
    },
    {
      cph_id: '   ',
      la_name: 'Invalid',
      location_id: 'LOC-INVALID',
      party_id: 'PARTY-INVALID'
    }
  ]

  const holdings = toHoldings(rows, ['11/111/1111', '99/999/9999'])

  expect(holdings).toEqual([
    {
      type: 'holdings',
      id: '11/111/1111',
      localAuthority: 'LA name 001',
      relationships: {
        location: {
          data: {
            type: 'locations',
            id: 'LOC-11-A'
          }
        },
        cphHolder: {
          data: {
            type: 'customers',
            id: 'PARTY-11-A'
          }
        }
      }
    }
  ])
})

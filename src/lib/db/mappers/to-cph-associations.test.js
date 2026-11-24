import { expect, test } from '@jest/globals'

import { runWithMaskingContext } from '../../pii/index.js'
import { toCphAssociations } from './to-cph-associations.js'

const row = (overrides) => ({
  party_pk: 100,
  cph: '12/345/6789',
  main_role_type: 'CUSTOMER',
  role_type: 'CPHHOLDER',
  role_name: 'CPH Holder',
  involvement_type: 'CPHHOLDERSHIP',
  location_id: 'L1',
  livestock_unit_id: null,
  ...overrides
})

const keeper = {
  role_type: 'LIVESTOCKKEEPER',
  role_name: 'Livestock Keeper'
}

test('returns an empty array for no rows', () => {
  expect(toCphAssociations([])).toEqual([])
})

test('groups rows by CPH and role, listing each id once and sorted', () => {
  const rows = [
    row({ location_id: 'L2' }),
    row({ location_id: 'L1' }),
    row({ location_id: 'L1' }),
    row({
      ...keeper,
      involvement_type: 'PRIMARYKEEPEROF',
      location_id: 'L2',
      livestock_unit_id: 'U2'
    }),
    row({
      ...keeper,
      involvement_type: 'SECONDARYKEEPEROF',
      location_id: 'L1',
      livestock_unit_id: 'U1'
    })
  ]

  expect(toCphAssociations(rows)).toEqual([
    {
      cph: '12/345/6789',
      role: {
        mainRoleType: 'CUSTOMER',
        roleType: 'CPHHOLDER',
        roleName: 'CPH Holder'
      },
      involvementTypes: ['CPHHOLDERSHIP'],
      locationIds: ['L1', 'L2'],
      livestockUnitIds: []
    },
    {
      cph: '12/345/6789',
      role: {
        mainRoleType: 'CUSTOMER',
        roleType: 'LIVESTOCKKEEPER',
        roleName: 'Livestock Keeper'
      },
      involvementTypes: ['PRIMARYKEEPEROF', 'SECONDARYKEEPEROF'],
      locationIds: ['L1', 'L2'],
      livestockUnitIds: ['U1', 'U2']
    }
  ])
})

test('keeps the order of the query rows', () => {
  const rows = [
    row({ cph: '11/000/0001' }),
    row({ cph: '11/000/0001', ...keeper }),
    row({ cph: '22/000/0001' })
  ]

  expect(toCphAssociations(rows).map(({ cph }) => cph)).toEqual([
    '11/000/0001',
    '11/000/0001',
    '22/000/0001'
  ])
})

test('keeps an association with no location or unit', () => {
  const [association] = toCphAssociations([row({ location_id: null })])

  expect(association.locationIds).toEqual([])
  expect(association.livestockUnitIds).toEqual([])
})

test('returns a null role name when SAM has no label for the role', () => {
  const [association] = toCphAssociations([row({ role_name: null })])

  expect(association.role.roleName).toBeNull()
})

test('does not mask anything', () => {
  const rows = [row({ livestock_unit_id: 'U000001' })]

  const masked = runWithMaskingContext({ shouldMask: true }, () =>
    toCphAssociations(rows)
  )

  expect(masked).toEqual(toCphAssociations(rows))
})

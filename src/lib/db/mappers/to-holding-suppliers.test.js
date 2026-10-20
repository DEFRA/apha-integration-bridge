import { expect, test } from '@jest/globals'

import { runWithMaskingContext } from '../../pii/index.js'
import { toHoldingSuppliers } from './to-holding-suppliers.js'

const involvement = (
  key,
  type,
  roleType,
  unitId,
  partyType = 'ORGANISATION'
) => ({
  party_pk: 100,
  party_id: 'C100',
  party_type: partyType,
  organisation_name: 'Hill Vets Ltd',
  role_type: roleType,
  involvement_pk: key,
  involvement_type: type,
  location_id: 'L10',
  livestock_unit_id: unitId,
  involvement_from_date: new Date(2016, 4, 1)
})

test('lists a supplier once, with every role behind its involvements and each involvement once', () => {
  const rows = [
    involvement(1, 'OVFOR', 'OVPRACTICE', 'U1'),
    // a second current version of the party repeats its rows
    involvement(1, 'OVFOR', 'OVPRACTICE', 'U1', 'PERSON'),
    involvement(2, 'DPFOR', 'DELIVERYPARTNER', 'U2')
  ]

  expect(toHoldingSuppliers(rows)).toEqual([
    {
      type: 'suppliers',
      id: 'C100',
      partyType: 'ORGANISATION',
      title: null,
      firstName: null,
      lastName: null,
      organisationName: 'Hill Vets Ltd',
      supplierTypes: ['OVPRACTICE', 'DELIVERYPARTNER'],
      involvements: [
        {
          involvementType: 'OVFOR',
          locationId: 'L10',
          livestockUnitId: 'U1',
          from: '2016-05-01'
        },
        {
          involvementType: 'DPFOR',
          locationId: 'L10',
          livestockUnitId: 'U2',
          from: '2016-05-01'
        }
      ]
    }
  ])
})

test('returns no suppliers for no rows', () => {
  expect(toHoldingSuppliers([])).toEqual([])
})

test('lists an involvement once for each location SAM places its unit at', () => {
  const atLocation = (locationId) => ({
    ...involvement(1, 'OVFOR', 'OVPRACTICE', 'U1'),
    location_id: locationId
  })

  const [supplier] = toHoldingSuppliers([atLocation('L10'), atLocation('L20')])

  expect(supplier.involvements.map((i) => i.locationId)).toEqual(['L10', 'L20'])
})

test('masks the title like the other names', () => {
  const [supplier] = runWithMaskingContext({ shouldMask: true }, () =>
    toHoldingSuppliers([
      {
        ...involvement(1, 'OVFOR', 'OVPRACTICE', 'U1', 'PERSON'),
        organisation_name: null,
        person_title: 'DR',
        person_given_name: 'Sam',
        person_family_name: 'Herriot'
      }
    ])
  )

  expect(supplier).toMatchObject({
    title: '**',
    firstName: '***',
    lastName: 'H*****t'
  })
})

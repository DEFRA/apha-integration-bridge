import { expect, test } from '@jest/globals'

import { toStructuredLocations } from './to-structured-locations.js'

const locationRow = (locationId, featureKey, fields = {}) => ({
  location_id: locationId,
  feature_pk: featureKey,
  feature_status_code: 'COMPLETE',
  feature_state_reason_code: null,
  feature_state_from_dttm: new Date(Date.UTC(2015, 0, 1, 9, 30)),
  ...fields
})

const addressRow = (locationId, featureKey, key, rank, street) =>
  locationRow(locationId, featureKey, {
    feature_address_pk: key,
    address_rank: rank,
    feature_address_from_date: new Date(Date.UTC(2015, 0, 1)),
    street
  })

const subLocationRow = (premisesKey, key) => ({
  premises_feature_pk: premisesKey,
  feature_pk: key,
  sub_location_type: 'FIELD',
  feature_status_code: 'COMPLETE'
})

test('returns each location in the order of the ids, with its own status and sub-locations', () => {
  const locations = toStructuredLocations(
    [
      locationRow('L10', 10),
      locationRow('L20', 20, {
        feature_status_code: 'MIGRATED',
        feature_state_reason_code: 'VETNETDATAMIG'
      })
    ],
    [subLocationRow(20, 21)],
    ['L20', 'L10']
  )

  expect(
    locations.map(({ id, status, subLocations }) => ({
      id,
      status,
      subLocations: subLocations.map((subLocation) => subLocation.id)
    }))
  ).toEqual([
    {
      id: 'L20',
      status: {
        code: 'MIGRATED',
        reasonCode: 'VETNETDATAMIG',
        since: '2015-01-01T09:30:00Z'
      },
      subLocations: ['21']
    },
    {
      id: 'L10',
      status: {
        code: 'COMPLETE',
        reasonCode: null,
        since: '2015-01-01T09:30:00Z'
      },
      subLocations: []
    }
  ])
})

test('puts the preferred address in `address` whichever row comes first', () => {
  const [location] = toStructuredLocations(
    [
      addressRow('L10', 10, 2, 2, 'Back Lane'),
      addressRow('L10', 10, 1, 1, 'Hill Lane')
    ],
    [],
    ['L10']
  )

  expect(location.address.street).toBe('Hill Lane')
  expect(
    location.addresses.map(({ street, isPreferred }) => ({
      street,
      isPreferred
    }))
  ).toEqual([
    { street: 'Hill Lane', isPreferred: true },
    { street: 'Back Lane', isPreferred: false }
  ])
})

test('gives a sub-location its own point, and its own address only when it has one', () => {
  const [location] = toStructuredLocations(
    [locationRow('L10', 10)],
    [
      {
        ...subLocationRow(10, 11),
        easting: 412310,
        northing: 323410,
        os_map_reference: 'SK1231023410',
        feature_point_type: 'BUILDING',
        feature_address_pk: 21,
        feature_address_from_date: new Date(Date.UTC(2015, 2, 1)),
        street: 'Test Street'
      },
      subLocationRow(10, 12)
    ],
    ['L10']
  )

  const [shed, field] = location.subLocations

  expect(shed.position).toEqual({
    easting: 412310,
    northing: 323410,
    osMapReference: 'SK1231023410',
    pointType: 'BUILDING'
  })
  expect(shed.address).toMatchObject({
    street: 'Test Street',
    isPreferred: true,
    from: '2015-03-01'
  })
  expect(field.position).toBeNull()
  expect(field).not.toHaveProperty('address')
})

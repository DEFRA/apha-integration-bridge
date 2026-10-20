import { expect, test } from '@jest/globals'

import { toHoldingLocations } from './to-holding-locations.js'

const holdership = (key, locationId, featureKey) => ({
  feature_involvement_pk: key,
  location_id: locationId,
  feature_pk: featureKey,
  vetnet_core_id: key
})

const subLocation = (status, since) => ({
  premises_feature_pk: 10,
  feature_pk: 11,
  sub_location_type: 'FIELD',
  feature_status_code: status,
  feature_state_from_dttm: since
})

const older = subLocation('PARTIAL', new Date(2015, 0, 1))
const latest = subLocation('COMPLETE', new Date(2020, 0, 1))

test.each([[[older, latest]], [[latest, older]]])(
  'lists a sub-location with several current states once, with the latest',
  (subLocationRows) => {
    const [location] = toHoldingLocations(
      [holdership(1, 'L10', 10)],
      [{ location_id: 'L10' }],
      subLocationRows
    )

    expect(location.subLocations.map((s) => s.status)).toEqual([
      { code: 'COMPLETE', reasonCode: null, since: '2020-01-01T00:00:00Z' }
    ])
  }
)

test('leaves out a holdership whose location find-locations.sql does not return', () => {
  const locations = toHoldingLocations(
    [holdership(1, 'L10', 10), holdership(2, 'L20', 20)],
    [{ location_id: 'L20' }],
    []
  )

  expect(locations.map((location) => location.id)).toEqual(['L20'])
})

test.each([
  [800000, 336300, null, null],
  [435300, -1, null, null],
  [435300, null, null, null],
  [700000, 1300000, 700000, 1300000]
])(
  'returns a point at %p, %p as %p, %p, with its map reference as stored',
  (easting, northing, expectedEasting, expectedNorthing) => {
    const [location] = toHoldingLocations(
      [holdership(1, 'L10', 10)],
      [
        {
          location_id: 'L10',
          easting,
          northing,
          os_map_reference: 'SK35303630',
          feature_point_type: 'NOTKNOWN'
        }
      ],
      []
    )

    expect(location.position).toEqual({
      easting: expectedEasting,
      northing: expectedNorthing,
      osMapReference: 'SK35303630',
      pointType: 'NOTKNOWN'
    })
  }
)

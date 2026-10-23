import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import hapiPino from 'hapi-pino'

import { oracleDb } from '../../../common/helpers/oracledb.js'
import { execute } from '../operations/execute.js'
import { findLocationsQuery } from './find-locations.js'
import { getLocation } from './get-location.js'

/**
 * Runs both location queries against the local Oracle fixtures and checks the
 * position and address columns that no route reads yet (DSFAAP-2927). The rows
 * are seeded by .docker-compose/oracledb/010_add_location_position_and_address.sql
 */

/** @type {import('@hapi/hapi').Server} */
let server

beforeAll(async () => {
  server = Hapi.server({ port: 0 })

  await server.register([
    { plugin: hapiPino, options: { enabled: false } },
    oracleDb
  ])
})

afterAll(() => server.stop())

async function rowsFor(query) {
  await using oracledb = await server['oracledb.sam']()

  return execute(oracledb.connection, query)
}

const positionOf = (row) => ({
  pointType: row.feature_point_type,
  easting: row.easting,
  northing: row.northing,
  osMapReference: row.os_map_reference
})

/**
 * One entry per address link in rank order; the unit and holdership rows carry
 * none
 */
const addressesOf = (rows) => {
  const byLink = new Map()

  for (const row of rows.filter((row) => row.feature_address_pk !== null)) {
    byLink.set(row.feature_address_pk, {
      featureAddressPk: row.feature_address_pk,
      rank: row.address_rank,
      nonPostal: row.non_postal_address_ind,
      street: row.street
    })
  }

  return [...byLink.values()].sort((a, b) => a.rank - b.rank)
}

describe.each([
  ['findLocationsQuery', (id) => findLocationsQuery([id])],
  ['getLocation', (id) => getLocation(id)]
])('%s position and address columns', (_, queryFor) => {
  test('two current primary points: the latest wins, not the highest key', async () => {
    const rows = await rowsFor(queryFor('L98001'))

    expect(rows.length).toBeGreaterThan(0)

    for (const row of rows) {
      expect(positionOf(row)).toEqual({
        pointType: 'CENTROID',
        easting: 412345,
        northing: 323456,
        osMapReference: 'SK123456'
      })
    }
  })

  test('a point with only an OS map reference, and an ended address link', async () => {
    const rows = await rowsFor(queryFor('L98002'))

    expect(positionOf(rows[0])).toEqual({
      pointType: 'NOTKNOWN',
      easting: null,
      northing: null,
      osMapReference: 'SK789012'
    })
    expect(addressesOf(rows)).toEqual([
      { featureAddressPk: 96004, rank: 1, nonPostal: 'N', street: 'Farm Road' }
    ])
  })

  test('a zero coordinate nulls both, a blank map reference is null, and no address', async () => {
    const rows = await rowsFor(queryFor('L98003'))

    expect(positionOf(rows[0])).toEqual({
      pointType: 'NOTKNOWN',
      easting: null,
      northing: null,
      osMapReference: null
    })
    expect(addressesOf(rows)).toEqual([])
  })

  // fixture 020 gives Hill Top Yard the county Exampleshire, which is not a
  // COUNTY code
  test('a county that is not a COUNTY code comes back as SAM holds it', async () => {
    const rows = await rowsFor(queryFor('L298210'))

    expect(
      rows
        .filter((row) => row.feature_address_pk !== null)
        .map((row) => ({ street: row.street, county: row.county }))
    ).toEqual([
      { street: 'Hill Lane', county: null },
      { street: 'Back Lane', county: 'Exampleshire' }
    ])
  })

  test('no point, and several current addresses ranked postal first, then latest from date, then highest key', async () => {
    const rows = await rowsFor(queryFor('L97339'))

    expect(positionOf(rows[0])).toEqual({
      pointType: null,
      easting: null,
      northing: null,
      osMapReference: null
    })
    expect(addressesOf(rows)).toEqual([
      { featureAddressPk: 96001, rank: 1, nonPostal: 'N', street: 'Farm Lane' },
      { featureAddressPk: 96006, rank: 2, nonPostal: 'Y', street: 'Yard Lane' },
      { featureAddressPk: 96007, rank: 3, nonPostal: 'Y', street: 'Back Lane' }
    ])
  })
})

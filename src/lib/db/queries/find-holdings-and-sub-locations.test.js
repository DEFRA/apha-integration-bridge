import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import hapiPino from 'hapi-pino'

import { oracleDb } from '../../../common/helpers/oracledb.js'
import { execute } from '../operations/execute.js'
import { findHoldingsQuery } from './find-holdings.js'
import { findSubLocationsQuery } from './find-sub-locations.js'

/**
 * Runs the holdership and sub-location queries against the local Oracle
 * fixtures and checks the columns that no route reads yet (DSFAAP-2926). The
 * rows are seeded by
 * .docker-compose/oracledb/011_add_holdership_and_sub_location_columns.sql
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

const holdershipOf = (row) => ({
  cph: row.cph_id,
  vetnetCoreId: row.vetnet_core_id,
  cphType: row.cph_type,
  locationId: row.location_id,
  partyId: row.party_id,
  featurePk: row.feature_pk,
  featureName: row.feature_name,
  statusCode: row.feature_status_code,
  reasonCode: row.feature_state_reason_code
})

const byCoreId = (a, b) => a.vetnetCoreId - b.vetnetCoreId

describe('find-holdings.sql holderships', () => {
  test('a single holdership returns one row with its keys and dates', async () => {
    const rows = await rowsFor(findHoldingsQuery(['11/111/1111']))

    expect(rows.map(holdershipOf)).toEqual([
      {
        cph: '11/111/1111',
        vetnetCoreId: 1,
        cphType: 'HOLDER_TEST',
        locationId: 'LOC-1111111111',
        partyId: 'CUST-111111111',
        featurePk: 81111,
        featureName: null,
        statusCode: 'ACTIVE',
        reasonCode: null
      }
    ])
    expect(rows[0].feature_involv_from_date).toBeInstanceOf(Date)
    expect(rows[0].feature_state_from_dttm).toBeInstanceOf(Date)
    expect(rows[0].feature_involvement_pk).toEqual(expect.any(Number))
  })

  test('two holderships are returned once each, although one is stored twice and a third CPH row has none', async () => {
    // Prove the fixture holds what the test claims before relying on the collapse
    const [stored] = await rowsFor({
      sql: `SELECT
              (SELECT COUNT(*) FROM AHBRP.FEATURE_INVOLVEMENT WHERE CPH = :cph AND VETNET_CORE_ID = 2) AS CORE_2_ROWS,
              (SELECT COUNT(*) FROM AHBRP.CPH WHERE CPH = :cph) AS CPH_ROWS
            FROM DUAL`,
      bindings: { cph: '01/409/1111' }
    })

    expect(stored).toEqual({ core_2_rows: 2, cph_rows: 3 })

    const rows = await rowsFor(findHoldingsQuery(['01/409/1111']))

    expect(rows.map(holdershipOf).sort(byCoreId)).toEqual([
      {
        cph: '01/409/1111',
        vetnetCoreId: 1,
        cphType: 'MULTI_LOC_TEST',
        locationId: 'LOC-OMEGA',
        partyId: 'CUST-014091111',
        featurePk: 6409,
        featureName: null,
        statusCode: 'ACTIVE',
        reasonCode: null
      },
      {
        cph: '01/409/1111',
        vetnetCoreId: 2,
        cphType: 'TEMPORARY',
        locationId: 'LOC-THETA',
        partyId: 'CUST-014091111',
        featurePk: 6410,
        featureName: null,
        statusCode: 'ACTIVE',
        reasonCode: null
      }
    ])
  })

  test('the feature name and the state reason code come through', async () => {
    const rows = await rowsFor(
      findHoldingsQuery(['98/001/0001', '22/222/2222'])
    )

    const named = rows
      .map(holdershipOf)
      .sort((a, b) => a.cph.localeCompare(b.cph))

    expect(
      named.map((h) => [h.cph, h.featurePk, h.featureName, h.reasonCode])
    ).toEqual([
      ['22/222/2222', 82222, null, 'VETNETDATAMIG'],
      ['98/001/0001', 91001, 'Test Farm Location', null]
    ])
  })

  test('an unknown CPH returns no rows', async () => {
    expect(await rowsFor(findHoldingsQuery(['00/000/0000']))).toEqual([])
  })
})

describe('find-sub-locations.sql', () => {
  test('returns the current sub-locations of each premises with their attributes and state', async () => {
    const rows = await rowsFor(findSubLocationsQuery([91001, 91002]))

    expect(
      rows.map((row) => ({
        premisesFeaturePk: row.premises_feature_pk,
        featurePk: row.feature_pk,
        name: row.feature_name,
        type: row.sub_location_type,
        usableArea: row.usable_area,
        usualStockQuantity: row.usual_stock_quantity,
        broilerDensity: row.broiler_stockg_density_range,
        statusCode: row.feature_status_code,
        reasonCode: row.feature_state_reason_code
      }))
    ).toEqual([
      {
        premisesFeaturePk: 91001,
        featurePk: 97001,
        name: 'Shed 1',
        type: 'BROILERSHED',
        usableArea: 1200,
        usualStockQuantity: 30000,
        broilerDensity: '33-39',
        statusCode: 'COMPLETE',
        reasonCode: null
      },
      {
        premisesFeaturePk: 91001,
        featurePk: 97002,
        name: 'Top Field',
        type: 'FIELD',
        usableArea: null,
        usualStockQuantity: null,
        broilerDensity: null,
        statusCode: 'MIGRATED',
        reasonCode: 'VETNETDATAMIG'
      }
    ])
    expect(rows[0].feature_relatn_from_date).toBeInstanceOf(Date)
    expect(rows[0].feature_state_from_dttm).toBeInstanceOf(Date)
  })

  // fixture 019's premises 298390: several current states per shed, and a
  // shed that is only INACTIVE
  test('takes the current state that is not INACTIVE, the latest, then the highest key, and leaves out an inactive sub-location', async () => {
    const rows = await rowsFor(findSubLocationsQuery([298390]))

    expect(
      rows.map((row) => ({
        featurePk: row.feature_pk,
        statusCode: row.feature_status_code,
        reasonCode: row.feature_state_reason_code
      }))
    ).toEqual([
      // PARTIAL since 2016, COMPLETE since 2020
      { featurePk: 298391, statusCode: 'COMPLETE', reasonCode: null },
      // COMPLETE and MIGRATED from the same moment
      {
        featurePk: 298392,
        statusCode: 'MIGRATED',
        reasonCode: 'VETNETDATAMIG'
      },
      // COMPLETE since 2015, INACTIVE since 2020
      { featurePk: 298393, statusCode: 'COMPLETE', reasonCode: null }
    ])
  })

  // fixture 018 gives the shed 97001 two current points and two current
  // addresses; the field 97002 has neither
  test('reads the latest current point and the postal address before a later non-postal one, one row each', async () => {
    const rows = await rowsFor(findSubLocationsQuery([91001]))

    expect(
      rows.map((row) => ({
        featurePk: row.feature_pk,
        easting: row.easting,
        northing: row.northing,
        osMapReference: row.os_map_reference,
        pointType: row.feature_point_type,
        featureAddressPk: row.feature_address_pk,
        street: row.street,
        county: row.county
      }))
    ).toEqual([
      {
        featurePk: 97001,
        easting: 412310,
        northing: 323410,
        osMapReference: 'SK1231023410',
        pointType: 'BUILDING',
        featureAddressPk: 298383,
        street: 'Test Street',
        county: 'Test County'
      },
      {
        featurePk: 97002,
        easting: null,
        northing: null,
        osMapReference: null,
        pointType: null,
        featureAddressPk: null,
        street: null,
        county: null
      }
    ])
  })
})

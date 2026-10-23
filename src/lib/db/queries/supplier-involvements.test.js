import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import hapiPino from 'hapi-pino'

import { oracleDb } from '../../../common/helpers/oracledb.js'
import { execute } from '../operations/execute.js'
import { findSupplierInvolvementsQuery } from './find-supplier-involvements.js'

/**
 * Runs the supplier-involvement query against the local Oracle fixtures
 * (DSFAAP-2982). The rows are seeded by
 * .docker-compose/oracledb/015_add_holding_sub_resource_scenarios.sql
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

const involvementOf = (row) => ({
  featurePk: row.feature_pk,
  locationId: row.location_id,
  unitId: row.livestock_unit_id,
  type: row.involvement_type,
  partyId: row.party_id,
  partyType: row.party_type,
  roleType: row.role_type,
  organisationName: row.organisation_name
})

describe('find-supplier-involvements.sql', () => {
  test('returns the practice and the delivery partner of each unit at the features, one row per involvement', async () => {
    const rows = await rowsFor(findSupplierInvolvementsQuery([298210, 298220]))

    // U298240 has both an OV practice and a DP, and the practice also serves
    // U298241; the ended OVFOR of C2982008 and U298240's keeper are absent
    expect(rows.map(involvementOf)).toEqual([
      {
        featurePk: 298210,
        locationId: 'L298210',
        unitId: 'U298240',
        type: 'OVFOR',
        partyId: 'C2982006',
        partyType: 'ORGANISATION',
        roleType: 'OVPRACTICE',
        organisationName: 'Hill Vets Ltd'
      },
      {
        featurePk: 298210,
        locationId: 'L298210',
        unitId: 'U298240',
        type: 'DPFOR',
        partyId: 'C2982007',
        partyType: 'ORGANISATION',
        roleType: 'DELIVERYPARTNER',
        organisationName: 'Dale Delivery Partnership'
      },
      {
        featurePk: 298220,
        locationId: 'L298220',
        unitId: 'U298241',
        type: 'OVFOR',
        partyId: 'C2982006',
        partyType: 'ORGANISATION',
        roleType: 'OVPRACTICE',
        organisationName: 'Hill Vets Ltd'
      }
    ])
  })

  test('returns the keys, the from date and the person name columns', async () => {
    const [row] = await rowsFor(findSupplierInvolvementsQuery([298210]))

    expect(row.party_pk).toBe(298206)
    expect(row.involvement_pk).toBe(298251)
    expect(row.involvement_from_date).toBeInstanceOf(Date)
    expect(row).toMatchObject({
      person_title: null,
      person_given_name: null,
      person_family_name: null
    })
  })

  test.each([
    // L98001's unit has keepers and an owner but no supplier, and L98002's unit has no involvement at all
    [[91001, 91002]],
    // 22/222/2222's location has no livestock unit
    [[82222]]
  ])(
    'returns no rows for features %p, which have no supplier',
    async (featureKeys) => {
      expect(await rowsFor(findSupplierInvolvementsQuery(featureKeys))).toEqual(
        []
      )
    }
  )
})

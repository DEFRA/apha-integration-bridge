import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import hapiPino from 'hapi-pino'

import { oracleDb } from '../../../common/helpers/oracledb.js'
import { execute } from '../operations/execute.js'
import { findPartyInvolvementsQuery } from './find-party-involvements.js'
import { findPartyRolesQuery } from './find-party-roles.js'

/**
 * Runs the party-involvement and party-role queries against the local Oracle
 * fixtures (DSFAAP-2928). The rows are seeded by
 * .docker-compose/oracledb/012_add_party_role_and_involvement_tables.sql
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
  type: row.involvement_type,
  status: row.involvement_status,
  unitId: row.livestock_unit_id,
  cph: row.cph,
  vetnetCoreId: row.vetnet_core_id,
  partyId: row.party_id,
  partyType: row.party_type,
  partyStatus: row.party_status_code,
  mainRoleType: row.main_role_type,
  roleType: row.role_type
})

const holder = (featurePk, locationId, cph, partyId, partyType) => ({
  featurePk,
  locationId,
  type: 'CPHHOLDERSHIP',
  status: null,
  unitId: null,
  cph,
  vetnetCoreId: 1,
  partyId,
  partyType,
  partyStatus: 'ACTIVE',
  mainRoleType: 'CUSTOMER',
  roleType: 'CPHHOLDER'
})

describe('find-party-involvements.sql', () => {
  test('returns the holder, the owner of place and the unit keepers and owners of each location, one row per involvement', async () => {
    const rows = await rowsFor(
      findPartyInvolvementsQuery([91001, 81111, 82222])
    )

    expect(rows.map(involvementOf)).toEqual([
      // 11/111/1111: a person holds it; the agent organisation's ownership of
      // the place has an end date, so it is absent
      holder(
        81111,
        'LOC-1111111111',
        '11/111/1111',
        'CUST-111111111',
        'PERSON'
      ),
      // 22/222/2222: an organisation holds it
      holder(
        82222,
        'LOC-2222222222',
        '22/222/2222',
        'CUST-222222222',
        'ORGANISATION'
      ),
      // 98/001/0001: the holder is also primary keeper and owner of LU98001001,
      // and the owner row's status is the ownership status, not the keepership
      // status that SAM also filled in; the ended keepership and the facility
      // ownership at the same location are absent
      holder(91001, 'L98001', '98/001/0001', 'CUST-98001', 'PERSON'),
      {
        featurePk: 91001,
        locationId: 'L98001',
        type: 'OWNEROF',
        status: 'CONFIRMED',
        unitId: 'LU98001001',
        cph: null,
        vetnetCoreId: null,
        partyId: 'CUST-98001',
        partyType: 'PERSON',
        partyStatus: 'ACTIVE',
        mainRoleType: 'CUSTOMER',
        roleType: 'LIVESTOCKOWNER'
      },
      {
        featurePk: 91001,
        locationId: 'L98001',
        type: 'PRIMARYKEEPEROF',
        status: 'ACTIVE',
        unitId: 'LU98001001',
        cph: null,
        vetnetCoreId: null,
        partyId: 'CUST-98001',
        partyType: 'PERSON',
        partyStatus: 'ACTIVE',
        mainRoleType: 'CUSTOMER',
        roleType: 'LIVESTOCKKEEPER'
      },
      {
        featurePk: 91001,
        locationId: 'L98001',
        type: 'SECONDARYKEEPEROF',
        status: 'UNCONFIRMED',
        unitId: 'LU98001001',
        cph: null,
        vetnetCoreId: null,
        partyId: 'CUST-KEEPER02',
        partyType: 'PERSON',
        partyStatus: 'ACTIVE',
        mainRoleType: 'CUSTOMER',
        roleType: 'LIVESTOCKKEEPER'
      }
    ])
  })

  test('an owner of place whose involvement ends in the future is not current', async () => {
    const rows = await rowsFor(findPartyInvolvementsQuery([81111]))

    expect(rows.map((row) => row.involvement_type)).toEqual(['CPHHOLDERSHIP'])
  })

  test('a current owner of place carries its keys and dates', async () => {
    const rows = await rowsFor(findPartyInvolvementsQuery([298210]))

    const owner = rows.find((row) => row.involvement_type === 'OWNEROFLOCATION')

    expect(owner.party_pk).toBe(298201)
    expect(owner.involvement_pk).toBe(298236)
    expect(owner.party_role_pk).toBe(29820102)
    expect(owner.last_checked_date).toBeInstanceOf(Date)
    expect(owner.involvement_from_date).toBeInstanceOf(Date)
    expect(owner.party_role_from_date).toBeInstanceOf(Date)
  })

  test('a feature key with no location returns no rows', async () => {
    expect(await rowsFor(findPartyInvolvementsQuery([1]))).toEqual([])
  })
})

describe('find-party-roles.sql', () => {
  test('returns every current role of each party with its decoded name, and none that has ended', async () => {
    const rows = await rowsFor(findPartyRolesQuery([94001, 29281, 29282]))

    expect(
      rows.map((row) => ({
        partyPk: row.party_pk,
        partyRolePk: row.party_role_pk,
        mainRoleType: row.main_role_type,
        roleType: row.role_type,
        roleName: row.role_name
      }))
    ).toEqual([
      {
        partyPk: 29281,
        partyRolePk: 2928101,
        mainRoleType: 'CUSTOMER',
        roleType: 'AGENT',
        roleName: 'Agent'
      },
      {
        partyPk: 29282,
        partyRolePk: 2928201,
        mainRoleType: 'CUSTOMER',
        roleType: 'LIVESTOCKKEEPER',
        roleName: 'Livestock Keeper'
      },
      {
        partyPk: 29282,
        partyRolePk: 2928203,
        mainRoleType: 'CUSTOMER',
        roleType: 'REGISTRANT',
        roleName: null
      },
      {
        partyPk: 94001,
        partyRolePk: 94001001,
        mainRoleType: 'CUSTOMER',
        roleType: 'CPHHOLDER',
        roleName: 'CPH Holder'
      },
      {
        partyPk: 94001,
        partyRolePk: 94001002,
        mainRoleType: 'CUSTOMER',
        roleType: 'LIVESTOCKKEEPER',
        roleName: 'Livestock Keeper'
      },
      {
        partyPk: 94001,
        partyRolePk: 94001003,
        mainRoleType: 'CUSTOMER',
        roleType: 'LIVESTOCKOWNER',
        roleName: 'Livestock Owner'
      }
    ])
    expect(rows[0].party_role_from_date).toBeInstanceOf(Date)
  })
})

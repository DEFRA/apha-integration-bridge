import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import hapiPino from 'hapi-pino'

import { oracleDb } from '../../../common/helpers/oracledb.js'
import { execute } from '../operations/execute.js'
import { findPartyAddressesQuery } from './find-party-addresses.js'

/**
 * Runs the party-address query against the local Oracle fixtures
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

const addressOf = (row) => ({
  partyPk: row.party_pk,
  linkPk: row.party_contact_address_pk,
  addressPk: row.address_pk,
  street: row.street,
  usageType: row.address_usage_type,
  preferred: row.preferred_contact_method_ind
})

describe('find-party-addresses.sql', () => {
  test('returns every current postal address of each party once, whether or not the party has a current version', async () => {
    const rows = await rowsFor(findPartyAddressesQuery([298201, 298205]))

    expect(rows.map(addressOf)).toEqual([
      {
        partyPk: 298201,
        linkPk: 29820111,
        addressPk: 298263,
        street: 'Mill Road',
        usageType: 'CORRESPONDENCE',
        preferred: 'Y'
      },
      // C2982005 has no current version. Its first link has two current
      // usages and comes back once, with the preferred one; the third starts
      // in the future but has no end date, so it is current. The links that
      // end in the future, have ended or lead to an ended address are absent.
      {
        partyPk: 298205,
        linkPk: 29820511,
        addressPk: 298271,
        street: 'Church Street',
        usageType: 'HOME',
        preferred: 'Y'
      },
      {
        partyPk: 298205,
        linkPk: 29820513,
        addressPk: 298273,
        street: 'New Road',
        usageType: null,
        preferred: null
      }
    ])
  })

  test('returns the address fields, both country codes and the link from date', async () => {
    const [row] = await rowsFor(findPartyAddressesQuery([298201]))

    expect(row).toMatchObject({
      paon_start_number: 4,
      town: 'Exampleton',
      postcode: 'EX2 1MR',
      county: null,
      uk_internal_code: 'England',
      country_code: 'GB'
    })
    expect(row.party_contact_from_date).toBeInstanceOf(Date)
  })

  test('returns the address the customers fixture seeds for C123456', async () => {
    const rows = await rowsFor(findPartyAddressesQuery([61001]))

    expect(rows.map(addressOf)).toEqual([
      {
        partyPk: 61001,
        linkPk: 81001,
        addressPk: 71001,
        street: 'Street',
        usageType: 'POSTAL',
        preferred: 'N'
      }
    ])
  })

  test('a party key with no party returns no rows', async () => {
    expect(await rowsFor(findPartyAddressesQuery([1]))).toEqual([])
  })
})

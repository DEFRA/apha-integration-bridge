import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import hapiPino from 'hapi-pino'

import { oracleDb } from '../../../common/helpers/oracledb.js'
import { execute } from '../operations/execute.js'
import { findOrganisationAttributesQuery } from './find-organisation-attributes.js'

/**
 * Runs the organisation-attributes query against the local Oracle fixtures
 * (DSFAAP-2930). The rows are seeded by
 * .docker-compose/oracledb/014_add_organisation_type_column.sql
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

const organisationOf = (row) => ({
  partyPk: row.party_pk,
  partyId: row.party_id,
  name: row.organisation_name,
  type: row.organisation_type
})

describe('find-organisation-attributes.sql', () => {
  test('returns the name and type of each organisation party, a Defra unit included', async () => {
    const rows = await rowsFor(
      findOrganisationAttributesQuery([293001, 293002, 293003])
    )

    expect(rows.map(organisationOf)).toEqual([
      // an ordinary organisation, which SAM types NOTKNOWN
      {
        partyPk: 293001,
        partyId: 'CUST-2930A',
        name: 'Hartley Poultry Ltd',
        type: 'NOTKNOWN'
      },
      // one of Defra's own organisational units is returned like any other,
      // and its type marks it
      {
        partyPk: 293002,
        partyId: 'ACAR2930',
        name: 'APHA Carlisle Office',
        type: 'AHORGUNIT'
      }
      // CUST-2930C's organisation version has ended, so it is absent
    ])
  })

  test('returns the organisation the customers fixture seeds for O123456, typed NOTKNOWN', async () => {
    const rows = await rowsFor(findOrganisationAttributesQuery([61003]))

    expect(rows.map(organisationOf)).toEqual([
      {
        partyPk: 61003,
        partyId: 'O123456',
        name: 'Acme Farms Ltd',
        type: 'NOTKNOWN'
      }
    ])
  })

  test('a person party returns no rows', async () => {
    expect(await rowsFor(findOrganisationAttributesQuery([61001]))).toEqual([])
  })

  test('a party key with no party returns no rows', async () => {
    expect(await rowsFor(findOrganisationAttributesQuery([1]))).toEqual([])
  })
})

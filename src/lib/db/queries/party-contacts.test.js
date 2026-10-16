import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import hapiPino from 'hapi-pino'

import { oracleDb } from '../../../common/helpers/oracledb.js'
import { execute } from '../operations/execute.js'
import { findPartyContactsQuery } from './find-party-contacts.js'

/**
 * Runs the party-contact query against the local Oracle fixtures
 * (DSFAAP-2929). The rows are seeded by
 * .docker-compose/oracledb/013_add_party_contact_columns.sql
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

const contactOf = (row) => ({
  partyPk: row.party_pk,
  linkPk: row.party_contact_address_pk,
  partyRolePk: row.party_role_pk,
  type: row.telecom_address_type,
  value: row.contact_value,
  countryCode: row.telephone_country_code,
  extension: row.extension_number,
  usageType: row.address_usage_type,
  preferred: row.preferred_contact_method_ind
})

const contact = (
  partyPk,
  linkPk,
  type,
  value,
  usageType,
  preferred,
  extra
) => ({
  partyPk,
  linkPk,
  partyRolePk: null,
  type,
  value,
  countryCode: null,
  extension: null,
  usageType,
  preferred,
  ...extra
})

describe('find-party-contacts.sql', () => {
  test('returns every current contact of each party once, held directly or through a current role', async () => {
    const rows = await rowsFor(findPartyContactsQuery([292901, 292902]))

    expect(rows.map(contactOf)).toEqual([
      // CUST-2929A: two current mobiles, the first preferred for home use and
      // the second with no usage row
      contact(292901, 29290101, 'MOBILE', '07700 900101', 'HOME', 'Y'),
      contact(292901, 29290102, 'MOBILE', '07700 900102', null, null),
      // a landline with a country code and extension, on a link that ends in
      // the future
      contact(
        292901,
        29290103,
        'LANDLINE',
        '01234 567890',
        'CORRESPONDENCE',
        'N',
        {
          countryCode: '44',
          extension: '123'
        }
      ),
      // a fax whose blank country code and preferred indicator come back null
      contact(292901, 29290104, 'FAX', '01234 567891', 'CORRESPONDENCE', null),
      // an e-mail with two current usage rows is returned once, with the
      // preferred one
      contact(
        292901,
        29290105,
        'EMAIL',
        'a.person@example.com',
        'PLACEOFBUSINESS',
        'Y'
      ),
      // an e-mail stored as blanks has a null value; the current link to an
      // ended mobile and the ended link to a current landline are absent
      contact(292901, 29290108, 'EMAIL', null, null, null),
      // CUST-2929B holds a mobile through a current role; the landline held
      // through its ended role is absent
      contact(
        292902,
        29290201,
        'MOBILE',
        '07700 900201',
        'PLACEOFBUSINESS',
        'Y',
        {
          partyRolePk: 29290201
        }
      )
    ])
  })

  test('returns the keys and the from date of each contact', async () => {
    const rows = await rowsFor(findPartyContactsQuery([292902]))

    expect(rows).toHaveLength(1)
    expect(rows[0].party_pk).toBe(292902)
    expect(rows[0].party_contact_address_pk).toBe(29290201)
    expect(rows[0].telecom_address_pk).toBe(29290201)
    expect(rows[0].party_contact_from_date).toBeInstanceOf(Date)
  })

  test('returns the contacts the customers fixture seeds for C123456', async () => {
    const rows = await rowsFor(findPartyContactsQuery([61001]))

    expect(rows.map(contactOf)).toEqual([
      contact(61001, 82001, 'EMAIL', 'example@example.com', 'EMAIL', 'N'),
      contact(61001, 82002, 'MOBILE', '+44 11111 11111', 'MOBILE', 'Y')
    ])
  })

  test('a party key with no party returns no rows', async () => {
    expect(await rowsFor(findPartyContactsQuery([1]))).toEqual([])
  })
})

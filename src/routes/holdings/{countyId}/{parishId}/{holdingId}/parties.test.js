import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'

import { clientScopesPlugin } from '../../../../../common/helpers/client-scopes.js'
import { oracleDb } from '../../../../../common/helpers/oracledb.js'
import { piiContextPlugin } from '../../../../../common/helpers/pii-context.js'
import { registerSimpleAuthStrategy } from '../../../../../common/helpers/test-helpers/simple-auth.js'
import { versionPlugin } from '../../../../../common/helpers/versioning.js'
import route from './parties.js'

/**
 * Runs against the local Oracle fixtures. 29/820/0001 is seeded by
 * .docker-compose/oracledb/015_add_holding_sub_resource_scenarios.sql
 */

const PII_CLIENT_ID = 'pii-client'

/** @type {import('@hapi/hapi').Server} */
let server

beforeAll(async () => {
  server = Hapi.server({ port: 0 })

  await server.register([
    { plugin: hapiPino, options: { enabled: false } },
    {
      plugin: clientScopesPlugin,
      options: {
        clientsScopes: [{ client_id: PII_CLIENT_ID, scopes: ['pii'] }]
      }
    },
    piiContextPlugin,
    versionPlugin,
    oracleDb
  ])

  registerSimpleAuthStrategy(server, {
    getClientId: (request) => request.headers['x-client-id']
  })

  server.route({
    ...route,
    path: '/holdings/{countyId}/{parishId}/{holdingId}/parties'
  })
})

afterAll(() => server.stop())

/**
 * @param {string} cph
 * @param {Record<string, string>} [headers]
 */
const getParties = async (cph, headers = { 'x-client-id': PII_CLIENT_ID }) => {
  const response = await server.inject({
    url: `/holdings/${cph}/parties`,
    headers
  })

  return {
    statusCode: response.statusCode,
    result: /** @type {Record<string, any>} */ (response.result)
  }
}

const addressableObject = (startNumber = null) => ({
  startNumber,
  startNumberSuffix: null,
  endNumber: null,
  endNumberSuffix: null,
  description: null
})

const holder = (locationId, vetnetCoreId, from, selected) => ({
  role: 'holder',
  involvementType: 'CPHHOLDERSHIP',
  locationId,
  vetnetCoreId,
  livestockUnitId: null,
  status: null,
  lastChecked: null,
  from,
  selected
})

const role = (roleType, roleName, from) => ({
  mainRoleType: 'CUSTOMER',
  roleType,
  roleName,
  from
})

const annHill = {
  type: 'parties',
  id: 'C2982001',
  partyType: 'PERSON',
  title: 'Mrs',
  firstName: 'Ann',
  middleName: null,
  lastName: 'Hill',
  organisationName: null,
  organisationType: null,
  namedContacts: null,
  roles: [
    role('CPHHOLDER', 'CPH Holder', '2015-01-01'),
    role('LANDOWNER', 'Land Owner', '2016-01-01')
  ],
  addresses: [
    {
      primaryAddressableObject: addressableObject(4),
      secondaryAddressableObject: addressableObject(),
      street: 'Mill Road',
      locality: null,
      town: 'Exampleton',
      county: null,
      postcode: 'EX2 1MR',
      countryCode: 'England',
      isPreferred: true,
      ukInternalCode: 'England'
    }
  ],
  contactMethods: [
    {
      type: 'mobile',
      phoneNumber: '07700 900101',
      isPreferred: true,
      usageType: 'HOME'
    },
    {
      type: 'mobile',
      phoneNumber: '07700 900201',
      isPreferred: false,
      usageType: null
    }
  ],
  involvements: [
    holder('L298210', '1', '2015-01-01', false),
    {
      role: 'landOwner',
      involvementType: 'OWNEROFLOCATION',
      locationId: 'L298210',
      vetnetCoreId: null,
      livestockUnitId: null,
      status: 'CONFIRMED',
      lastChecked: '2023-05-01',
      from: '2016-01-01',
      selected: null
    },
    holder('L298220', '2', '2020-06-01', true)
  ]
}

const hillTopFarms = {
  type: 'parties',
  id: 'C2982002',
  partyType: 'ORGANISATION',
  title: null,
  firstName: null,
  middleName: null,
  lastName: null,
  organisationName: 'Hill Top Farms Ltd',
  organisationType: 'NOTKNOWN',
  namedContacts: {
    primaryContact: {
      fullName: 'J Hill',
      emailAddress: null,
      phoneNumber: null
    },
    secondaryContact: { fullName: null, emailAddress: null, phoneNumber: null }
  },
  roles: [role('CPHHOLDER', 'CPH Holder', '2018-03-01')],
  addresses: [],
  contactMethods: [
    {
      type: 'landline',
      phoneNumber: '01234 500100',
      isPreferred: true,
      usageType: 'PLACEOFBUSINESS'
    }
  ],
  involvements: [holder('L298210', '3', '2018-03-01', false)]
}

const tomDale = {
  type: 'parties',
  id: 'C2982003',
  partyType: 'PERSON',
  title: 'Mr',
  firstName: 'Tom',
  middleName: null,
  lastName: 'Dale',
  organisationName: null,
  organisationType: null,
  namedContacts: null,
  roles: [role('LIVESTOCKKEEPER', 'Livestock Keeper', '2016-04-01')],
  addresses: [],
  contactMethods: [
    {
      type: 'email',
      emailAddress: 't.dale@example.com',
      isPreferred: false,
      usageType: null
    },
    {
      type: 'fax',
      faxNumber: '01234 567892',
      isPreferred: false,
      usageType: null
    }
  ],
  involvements: [
    {
      role: 'keeper',
      involvementType: 'PRIMARYKEEPEROF',
      locationId: 'L298210',
      vetnetCoreId: null,
      livestockUnitId: 'U298240',
      status: 'ACTIVE',
      lastChecked: null,
      from: '2016-04-01',
      selected: null
    }
  ]
}

describe('GET /holdings/{countyId}/{parishId}/{holdingId}/parties', () => {
  test('returns every holder, land owner and keeper once, with an entry per involvement', async () => {
    const { statusCode, result } = await getParties('29/820/0001')

    expect(statusCode).toBe(200)

    // C2982001 holds two holderships and owns L298210, but keeps nothing
    // there; the stored copy of core 2, the holder of 29/820/0002 at L298210
    // and the second link to C2982001's first mobile are all left out.
    // C2982002's named contact has a name only, and its mobile that starts
    // in the future is in neither its contact methods nor its named contacts
    expect(result).toEqual({
      data: [annHill, hillTopFarms, tomDale],
      links: { self: '/holdings/29/820/0001/parties' }
    })
  })

  test('gives a masked client every contact entry, including two numbers that mask alike', async () => {
    const { statusCode, result } = await getParties('29/820/0001', {})

    expect(statusCode).toBe(200)

    const [party] = result.data

    expect(party.lastName).toBe('****')
    expect(party.contactMethods).toEqual([
      {
        type: 'mobile',
        phoneNumber: '0**********1',
        isPreferred: true,
        usageType: 'HOME'
      },
      {
        type: 'mobile',
        phoneNumber: '0**********1',
        isPreferred: false,
        usageType: null
      }
    ])
  })

  test.each(['00/000/0000', '99/999/9999'])(
    'returns 404 for %s, which has no active holdership',
    async (cph) => {
      const { statusCode, result } = await getParties(cph)

      expect(statusCode).toBe(404)
      expect(result).toEqual({
        message: 'Holding not found or inactive',
        code: 'NOT_FOUND',
        errors: []
      })
    }
  )

  test('returns 404 for an unsupported version', async () => {
    const { statusCode, result } = await getParties('29/820/0001', {
      'x-client-id': PII_CLIENT_ID,
      accept: 'application/vnd.apha.2+json'
    })

    expect(statusCode).toBe(404)
    expect(result.code).toBe('UNSUPPORTED_VERSION')
  })
})

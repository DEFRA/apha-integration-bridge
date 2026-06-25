import Hapi from '@hapi/hapi'
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import hapiPino from 'hapi-pino'

import route from './find.js'
import { registerSimpleAuthStrategy } from '../../common/helpers/test-helpers/simple-auth.js'
import { clientScopesPlugin } from '../../common/helpers/client-scopes.js'
import { oracleDb } from '../../common/helpers/oracledb.js'
import { opentelemetryPlugin } from '../../common/helpers/telemetry.js'
import { piiContextPlugin } from '../../common/helpers/pii-context.js'
import { execute } from '../../lib/db/operations/execute.js'

// Mock the execute operation so the error-handling tests can force failures.
// A `jest.spyOn(import * as executeOperation, 'execute')` does NOT reliably
// intercept the call made by the query module: under babel's interop the
// spy targets the `import *` namespace object while the query module reads the
// raw module export, so the spy silently no-ops and the real DB is hit. A
// module-factory mock replaces the module for every importer. The default
// delegates to the real implementation so the seeded-DB integration tests
// below are unaffected; individual tests override per call.
jest.mock('../../lib/db/operations/execute.js', () => {
  const actual = jest.requireActual('../../lib/db/operations/execute.js')
  return {
    __esModule: true,
    ...actual,
    execute: jest.fn((...args) => actual.execute(...args))
  }
})

const path = '/customers/find'
const organisationId = 'O123456'
const authToken = [
  Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString(
    'base64url'
  ),
  Buffer.from(
    JSON.stringify({
      iss: 'https://mock-cognito',
      client_id: 'test-client-id'
    })
  ).toString('base64url'),
  'sig'
].join('.')
const authHeaders = { authorization: `Bearer ${authToken}` }

const customer1 = {
  type: 'customers',
  id: 'C123456',
  title: 'Mr',
  firstName: 'Bert',
  middleName: null,
  lastName: 'Farmer',
  addresses: [
    {
      primaryAddressableObject: {
        startNumber: 12,
        startNumberSuffix: null,
        endNumber: null,
        endNumberSuffix: null,
        description: 'Rose cottage'
      },
      secondaryAddressableObject: {
        startNumber: 12,
        startNumberSuffix: null,
        endNumber: null,
        endNumberSuffix: null,
        description: null
      },
      street: 'Street',
      locality: null,
      town: 'Town',
      postcode: '1AA A11',
      countryCode: 'UKX001',
      county: 'County',
      isPreferred: false
    }
  ],
  contactDetails: [
    {
      type: 'email',
      emailAddress: 'example@example.com',
      isPreferred: false
    },
    {
      type: 'mobile',
      phoneNumber: '+44 11111 11111',
      isPreferred: true
    }
  ],
  relationships: {
    srabpiPlants: {
      data: []
    }
  }
}

const customer2 = {
  type: 'customers',
  id: 'C234567',
  title: 'Mrs',
  firstName: 'Roberta',
  middleName: null,
  lastName: 'Farmer',
  addresses: [
    {
      countryCode: null,
      county: null,
      isPreferred: false,
      locality: null,
      postcode: null,
      primaryAddressableObject: {
        description: null,
        endNumber: null,
        endNumberSuffix: null,
        startNumber: null,
        startNumberSuffix: null
      },
      secondaryAddressableObject: {
        description: null,
        endNumber: null,
        endNumberSuffix: null,
        startNumber: null,
        startNumberSuffix: null
      },
      street: null,
      town: null
    }
  ],
  contactDetails: [
    {
      type: 'landline',
      phoneNumber: '+44 1111 11111',
      isPreferred: true
    }
  ],
  relationships: {
    srabpiPlants: {
      data: []
    }
  }
}

async function createServer() {
  const server = Hapi.server({ port: 0 })

  await server.register([
    {
      plugin: hapiPino,
      options: {
        enabled: false
      }
    },
    oracleDb
  ])

  registerSimpleAuthStrategy(server)

  server.route({
    ...route,
    path,
    method: 'POST'
  })

  return server
}

describe('POST /customers/find', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('requires authentication explicitly', () => {
    expect(route.options.auth).toEqual({ mode: 'required' })
  })

  test('returns all matching ids', async () => {
    const server = await createServer()

    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '10'
    })

    const url = `${path}?${queryParams.toString()}`

    const response = await server.inject({
      method: 'POST',
      payload: {
        ids: [customer1.id, customer2.id]
      },
      headers: authHeaders,
      url
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      data: [customer1, customer2],
      links: {
        self: url,
        next: null,
        prev: null
      }
    })
  })

  test('returns an empty array for no matches', async () => {
    const server = await createServer()

    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '10'
    })

    const url = `${path}?${queryParams.toString()}`

    const response = await server.inject({
      method: 'POST',
      payload: {
        ids: ['missing', 'id']
      },
      headers: authHeaders,
      url
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      data: [],
      links: {
        self: url,
        next: null,
        prev: null
      }
    })
  })

  test('returns customers in order requested', async () => {
    const server = await createServer()

    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '10'
    })

    const url = `${path}?${queryParams.toString()}`

    const response = await server.inject({
      method: 'POST',
      payload: {
        ids: [customer2.id, customer1.id]
      },
      headers: authHeaders,
      url
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      data: [customer2, customer1],
      links: {
        self: url,
        next: null,
        prev: null
      }
    })
  })

  test('excludes organisation ids from results', async () => {
    const server = await createServer()

    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '10'
    })

    const url = `${path}?${queryParams.toString()}`

    const response = await server.inject({
      method: 'POST',
      payload: {
        ids: [customer1.id, organisationId, customer2.id]
      },
      headers: authHeaders,
      url
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      data: [customer1, customer2],
      links: {
        self: url,
        next: null,
        prev: null
      }
    })
  })

  test('returns an empty array when only organisation ids are requested', async () => {
    const server = await createServer()

    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '10'
    })

    const url = `${path}?${queryParams.toString()}`

    const response = await server.inject({
      method: 'POST',
      payload: {
        ids: [organisationId]
      },
      headers: authHeaders,
      url
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      data: [],
      links: {
        self: url,
        next: null,
        prev: null
      }
    })
  })

  test('returns customers paginated', async () => {
    const server = await createServer()

    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '1'
    })

    const firstUrl = `${path}?${queryParams.toString()}`

    const firstResponse = await server.inject({
      method: 'POST',
      payload: {
        ids: [customer2.id, customer1.id]
      },
      headers: authHeaders,
      url: firstUrl
    })

    const nextQueryParams = new URLSearchParams(queryParams.toString())

    nextQueryParams.set('page', '2')

    expect(firstResponse.statusCode).toBe(200)
    expect(firstResponse.result).toEqual({
      data: [customer2],
      links: {
        self: firstUrl,
        next: `${path}?${nextQueryParams.toString()}`,
        prev: null
      }
    })

    const secondResponse = await server.inject({
      method: 'POST',
      payload: {
        ids: [customer2.id, customer1.id]
      },
      headers: authHeaders,
      // @ts-expect-error - test response typing is not strict enough
      url: firstResponse.result.links.next
    })

    expect(secondResponse.statusCode).toBe(200)
    expect(secondResponse.result).toEqual({
      data: [customer1],
      links: {
        self: `${path}?${nextQueryParams.toString()}`,
        next: null,
        prev: firstUrl
      }
    })
  })

  test('returns next page link when a missing id reduces first page result count', async () => {
    const server = await createServer()

    const firstQueryParams = new URLSearchParams({
      page: '1',
      pageSize: '2'
    })

    const firstUrl = `${path}?${firstQueryParams.toString()}`
    const payload = {
      ids: [customer1.id, 'NONEXISTENT123', customer2.id]
    }

    const firstResponse = await server.inject({
      method: 'POST',
      payload,
      headers: authHeaders,
      url: firstUrl
    })

    const secondQueryParams = new URLSearchParams(firstQueryParams.toString())

    secondQueryParams.set('page', '2')

    expect(firstResponse.statusCode).toBe(200)
    expect(firstResponse.result).toEqual({
      data: [customer1],
      links: {
        self: firstUrl,
        next: `${path}?${secondQueryParams.toString()}`,
        prev: null
      }
    })

    const secondResponse = await server.inject({
      method: 'POST',
      payload,
      headers: authHeaders,
      // @ts-expect-error - test response typing is not strict enough
      url: firstResponse.result.links.next
    })

    expect(secondResponse.statusCode).toBe(200)
    expect(secondResponse.result).toEqual({
      data: [customer2],
      links: {
        self: `${path}?${secondQueryParams.toString()}`,
        next: null,
        prev: firstUrl
      }
    })
  })

  test('returns empty data and does not query DB or acquire connection when page is out of range', async () => {
    const server = await createServer()
    const executeSpy = jest.mocked(execute)
    const samSpy = jest.spyOn(server, /** @type {any} */ ('oracledb.sam'))
    const queryParams = new URLSearchParams({
      page: '2',
      pageSize: '10'
    })
    const url = `${path}?${queryParams.toString()}`

    const response = await server.inject({
      method: 'POST',
      payload: {
        ids: [customer1.id]
      },
      headers: authHeaders,
      url
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      data: [],
      links: {
        self: url,
        next: null,
        prev: '/customers/find?page=1&pageSize=10'
      }
    })
    expect(executeSpy).not.toHaveBeenCalled()
    expect(samSpy).not.toHaveBeenCalled()
  })

  test.each(['0', '51'])(
    'returns BAD_REQUEST if pageSize is out of bounds (%s)',
    async (pageSize) => {
      const server = await createServer()

      const queryParams = new URLSearchParams({
        page: '1',
        pageSize
      })

      const response = await server.inject({
        method: 'POST',
        payload: {
          ids: [customer1.id]
        },
        headers: authHeaders,
        url: `${path}?${queryParams.toString()}`
      })

      expect(response.statusCode).toBe(400)
    }
  )

  test('accepts pageSize at upper bound', async () => {
    const server = await createServer()

    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '50'
    })

    const response = await server.inject({
      method: 'POST',
      payload: {
        ids: [customer1.id]
      },
      headers: authHeaders,
      url: `${path}?${queryParams.toString()}`
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      data: [customer1],
      links: {
        self: `${path}?${queryParams.toString()}`,
        next: null,
        prev: null
      }
    })
  })
})

/**
 * End-to-end masking tests. These mirror the production plugin set
 * (`opentelemetryPlugin` + `clientScopesPlugin` + `piiContextPlugin`) and
 * exercise the real DB path. The OTel plugin is included on purpose: its
 * handler wrapper was previously incompatible with our masking context, and
 * registering it here proves the fix in [pii-context.js](../../common/helpers/pii-context.js)
 * holds up under the same conditions that broke it in production.
 */
describe('POST /customers/find — PII masking integration', () => {
  const PII_CLIENT_ID = 'pii-allowed-client'
  const UNKNOWN_CLIENT_ID = 'unknown-client'

  const clients = {
    wfm: { client_ids: [PII_CLIENT_ID], scopes: ['pii'] }
  }

  let otelRegistered = false

  /**
   * Creates base server with plugins for PII masking tests
   */
  const createBaseServer = async () => {
    const server = Hapi.server({ port: 0 })

    const plugins = [
      { plugin: hapiPino, options: { enabled: false } },
      { plugin: clientScopesPlugin, options: { clients } },
      piiContextPlugin,
      oracleDb
    ]

    if (!otelRegistered) {
      plugins.splice(1, 0, opentelemetryPlugin)
      otelRegistered = true
    }

    await server.register(plugins)

    return server
  }

  /**
   * Creates a test server with a specific client ID for PII masking tests
   * @param {string} clientId
   */
  const createServerWithClient = async (clientId) => {
    const server = await createBaseServer()

    registerSimpleAuthStrategy(server, { clientId })

    server.route({ ...route, path, method: 'POST' })

    return server
  }

  test('returns unmasked PII when the client_id has the pii scope', async () => {
    const server = await createServerWithClient(PII_CLIENT_ID)

    const response = await server.inject({
      method: 'POST',
      url: `${path}?page=1&pageSize=10`,
      payload: { ids: [customer1.id] }
    })

    expect(response.statusCode).toBe(200)

    const result = /** @type {Record<string, any>} */ (response.result)

    expect(result.data[0]).toEqual(customer1)
  })

  test('masks every PII field when the client_id is not in the clients config', async () => {
    const server = await createServerWithClient(UNKNOWN_CLIENT_ID)

    const response = await server.inject({
      method: 'POST',
      url: `${path}?page=1&pageSize=10`,
      payload: { ids: [customer1.id] }
    })

    expect(response.statusCode).toBe(200)

    const result = /** @type {Record<string, any>} */ (response.result)

    const [customer] = result.data

    expect(customer.id).toBe(customer1.id)
    // mask rule: <=5 chars fully masked; >5 chars keep first/last, mask middle
    expect(customer.title).toBe('**') // Mr
    expect(customer.firstName).toBe('****') // Bert
    expect(customer.lastName).toBe('F****r') // Farmer
    expect(customer.addresses[0].street).toBe('S****t') // Street
    expect(customer.addresses[0].town).toBe('****') // Town
    expect(customer.addresses[0].county).toBe('C****y') // County
    expect(customer.addresses[0].postcode).toBe('1*****1') // 1AA A11

    const email = customer.contactDetails.find((c) => c.type === 'email')
    const mobile = customer.contactDetails.find((c) => c.type === 'mobile')

    expect(email.emailAddress).toBe('e*****************m') // example@example.com
    expect(mobile.phoneNumber).toBe('+*************1') // +44 11111 11111
  })

  test('does not leak masking state between concurrent requests', async () => {
    const server = await createBaseServer()

    // Use getClientId to extract client_id from a custom test header
    registerSimpleAuthStrategy(server, {
      getClientId: (request) => request.headers['x-test-client-id']
    })

    server.route({ ...route, path, method: 'POST' })

    // Make concurrent requests with different client IDs to the same server
    const [unmaskedRes, maskedRes] = await Promise.all([
      server.inject({
        method: 'POST',
        url: `${path}?page=1&pageSize=10`,
        headers: { 'x-test-client-id': PII_CLIENT_ID },
        payload: { ids: [customer1.id] }
      }),
      server.inject({
        method: 'POST',
        url: `${path}?page=1&pageSize=10`,
        headers: { 'x-test-client-id': UNKNOWN_CLIENT_ID },
        payload: { ids: [customer1.id] }
      })
    ])

    const unmasked = /** @type {Record<string, any>} */ (unmaskedRes.result)
    const masked = /** @type {Record<string, any>} */ (maskedRes.result)

    expect(unmasked.data[0].firstName).toBe('Bert')
    expect(masked.data[0].firstName).toBe('****')
  })
})

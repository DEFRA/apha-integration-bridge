import Hapi from '@hapi/hapi'
import { describe, test, expect } from '@jest/globals'
import hapiPino from 'hapi-pino'

import route from './find.js'
import { bearerTokenPlugin } from '../../common/helpers/bearer-token.js'
import { oracleDb } from '../../common/helpers/oracledb.js'

const path = '/organisations/find'
const organisationId = 'O123456'
const customer1Id = 'C123456'
const customer2Id = 'C234567'
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

const organisation = {
  type: 'organisations',
  id: organisationId,
  organisationName: 'Acme Farms Ltd',
  address: {
    primaryAddressableObject: {
      startNumber: 100,
      startNumberSuffix: null,
      endNumber: null,
      endNumberSuffix: null,
      description: 'Head office'
    },
    secondaryAddressableObject: {
      startNumber: null,
      startNumberSuffix: null,
      endNumber: null,
      endNumberSuffix: null,
      description: null
    },
    street: 'Enterprise Way',
    locality: null,
    town: 'Town',
    postcode: '2BB B22',
    countryCode: 'GB'
  },
  contactDetails: {
    primaryContact: {
      fullName: 'Jane Contact',
      emailAddress: null,
      phoneNumber: null
    },
    secondaryContact: {
      fullName: 'John Contact',
      emailAddress: null,
      phoneNumber: null
    }
  },
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
    {
      plugin: bearerTokenPlugin
    },
    oracleDb
  ])

  server.route({
    ...route,
    path,
    method: 'POST'
  })

  return server
}

describe('POST /organisations/find', () => {
  test('requires authentication explicitly', () => {
    expect(route.options.auth).toEqual({ mode: 'required' })
  })

  test('returns UNAUTHORIZED when Authorization header is missing', async () => {
    const server = await createServer()

    const response = await server.inject({
      method: 'POST',
      payload: {
        ids: [organisationId]
      },
      url: `${path}?page=1&pageSize=10`
    })

    expect(response.statusCode).toBe(401)
  })

  test('returns all matching organisation ids', async () => {
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
      data: [organisation],
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

  test('returns an empty array when only person ids are requested', async () => {
    const server = await createServer()

    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '10'
    })

    const url = `${path}?${queryParams.toString()}`

    const response = await server.inject({
      method: 'POST',
      payload: {
        ids: [customer1Id, customer2Id]
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

  test('excludes person ids from mixed results', async () => {
    const server = await createServer()

    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '10'
    })

    const url = `${path}?${queryParams.toString()}`

    const response = await server.inject({
      method: 'POST',
      payload: {
        ids: [customer1Id, organisationId, customer2Id]
      },
      headers: authHeaders,
      url
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      data: [organisation],
      links: {
        self: url,
        next: null,
        prev: null
      }
    })
  })

  test('returns organisations paginated when non-organisation ids are present', async () => {
    const server = await createServer()

    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '1'
    })

    const firstUrl = `${path}?${queryParams.toString()}`

    const firstResponse = await server.inject({
      method: 'POST',
      payload: {
        ids: [organisationId, customer1Id]
      },
      headers: authHeaders,
      url: firstUrl
    })

    const nextQueryParams = new URLSearchParams(queryParams.toString())

    nextQueryParams.set('page', '2')

    expect(firstResponse.statusCode).toBe(200)
    expect(firstResponse.result).toEqual({
      data: [organisation],
      links: {
        self: firstUrl,
        next: `${path}?${nextQueryParams.toString()}`,
        prev: null
      }
    })

    const secondResponse = await server.inject({
      method: 'POST',
      payload: {
        ids: [organisationId, customer1Id]
      },
      headers: authHeaders,
      // @ts-expect-error - test response typing is not strict enough
      url: firstResponse.result.links.next
    })

    expect(secondResponse.statusCode).toBe(200)
    expect(secondResponse.result).toEqual({
      data: [],
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
      ids: [organisationId, 'NONEXISTENT123', customer1Id]
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
      data: [organisation],
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
      data: [],
      links: {
        self: `${path}?${secondQueryParams.toString()}`,
        next: null,
        prev: firstUrl
      }
    })
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
          ids: [organisationId]
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
        ids: [organisationId]
      },
      headers: authHeaders,
      url: `${path}?${queryParams.toString()}`
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      data: [organisation],
      links: {
        self: `${path}?${queryParams.toString()}`,
        next: null,
        prev: null
      }
    })
  })
})

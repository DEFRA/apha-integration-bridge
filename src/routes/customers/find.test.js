import Hapi from '@hapi/hapi'
import { describe, test, expect } from '@jest/globals'
import hapiPino from 'hapi-pino'

import route from './find.js'
import { bearerTokenPlugin } from '../../common/helpers/bearer-token.js'
import { oracleDb } from '../../common/helpers/oracledb.js'

const path = '/customers/find'
const organisationId = 'O123456'
const authToken = [
  Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString(
    'base64url'
  ),
  Buffer.from(JSON.stringify({ iss: 'https://mock-cognito' })).toString(
    'base64url'
  ),
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
      countryCode: null,
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
  addresses: [],
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

describe('POST /customers/find', () => {
  test('requires authentication explicitly', () => {
    expect(route.options.auth).toEqual({ mode: 'required' })
  })

  test('returns UNAUTHORIZED when Authorization header is missing', async () => {
    const server = await createServer()

    const response = await server.inject({
      method: 'POST',
      payload: {
        ids: [customer1.id]
      },
      url: `${path}?page=1&pageSize=10`
    })

    expect(response.statusCode).toBe(401)
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

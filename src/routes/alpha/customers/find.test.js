import Hapi from '@hapi/hapi'
import { test, expect, describe } from '@jest/globals'

import route from './find.js'
import { customer1, customer2 } from './find.mocks.js'

const path = '/customers/find'

describe('customers/find', () => {
  const server = Hapi.server()

  server.route({
    ...route,
    path,
    method: 'POST'
  })

  test('returns all matching ids', async () => {
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
      url
    })

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
      url
    })

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
      url
    })

    expect(response.result).toEqual({
      data: [customer2, customer1],
      links: {
        self: url,
        next: null,
        prev: null
      }
    })
  })

  test('returns customers paginated', async () => {
    const queryParams = new URLSearchParams({
      page: '1',
      pageSize: '1'
    })
    const url = `${path}?${queryParams.toString()}`
    const firstResponse = await server.inject({
      method: 'POST',
      payload: {
        ids: [customer2.id, customer1.id]
      },
      url
    })

    const nextQueryParams = new URLSearchParams(queryParams.toString())
    nextQueryParams.set('page', '2')

    expect(firstResponse.result).toEqual({
      data: [customer2],
      links: {
        self: url,
        next: `${path}?${nextQueryParams.toString()}`,
        prev: null
      }
    })

    const secondResponse = await server.inject({
      method: 'POST',
      payload: {
        ids: [customer2.id, customer1.id]
      },
      url: firstResponse.result.links.next
    })

    expect(secondResponse.result).toEqual({
      data: [customer1],
      links: {
        self: `${path}?${nextQueryParams.toString()}`,
        next: null,
        prev: url
      }
    })
  })
})

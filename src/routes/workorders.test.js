import Hapi from '@hapi/hapi'
import { test, expect } from '@jest/globals'

import * as route from './workorders.js'

test('returns the mock workorder', async () => {
  const server = Hapi.server({ port: 0 })

  const queryParams = new URLSearchParams({
    startActivationDate: new Date('2024-01-01').toISOString(),
    page: '1',
    pageSize: '1',
    endActivationDate: new Date('2030-01-01').toISOString()
  })

  /**
   * create a fake simple auth strategy
   */
  server.auth.scheme('simple', () => {
    return {
      authenticate: (_request, h) => {
        return h.authenticated({ credentials: {} })
      }
    }
  })

  server.auth.strategy('simple', 'simple', {})

  server.auth.default('simple')

  server.route({
    ...route,
    path: '/workorders',
    method: 'GET'
  })

  const firstPage = await server.inject({
    method: 'GET',
    url: `/workorders?${queryParams.toString()}`
  })

  const expectedNextParams = new URLSearchParams(queryParams.toString())

  expectedNextParams.set('page', '2')

  expect(firstPage.result).toMatchObject({
    data: [
      {
        type: 'workorders',
        id: 'WS-76512',
        status: 'Open',
        startDate: '2024-01-01T09:00:00+00:00',
        activationDate: '2024-01-05T08:30:00+00:00',
        purpose: 'Initiate Incident Premises Spread Tracing Action',
        workArea: 'Tuberculosis',
        country: 'SCOTLAND',
        businessArea: 'Endemic Notifiable Disease',
        aim: 'Contain / Control / Eradicate Endemic Disease',
        latestActivityCompletionDate: '2024-01-01T12:00:00+00:00',
        phase: 'EXPOSURETRACKING',
        relationships: {
          customer: {
            data: { type: 'customers', id: 'C123456' }
          },
          holding: {
            data: { type: 'holdings', id: '08/139/0167' }
          },
          location: {
            data: { type: 'locations', id: 'L123456' }
          },
          commodity: {
            data: { type: 'commodities', id: 'U000010' }
          },
          facility: {
            data: null
          },
          activities: {
            data: []
          }
        }
      }
    ],
    links: {
      next: `/workorders?${expectedNextParams.toString()}`
    }
  })

  const firstRelationships =
    /** @type {{ relationships: Record<string, { links?: unknown }> }} */ (
      firstPage.result
    ).data[0].relationships

  for (const relationship of Object.values(firstRelationships)) {
    expect(relationship).not.toHaveProperty('links')
  }

  expect(firstPage.statusCode).toBe(200)

  /**
   * @type {{ links: { next: string; prev?: string } }}
   */
  // @ts-expect-error - TypeScript doesn't know about the structure of the response
  const firstPageResponse = firstPage.result

  const secondPage = await server.inject({
    method: 'GET',
    url: firstPageResponse.links.next
  })

  const expectedSecondNextParams = new URLSearchParams(queryParams.toString())
  const expectedSecondPrevParams = new URLSearchParams(queryParams.toString())

  expectedSecondNextParams.set('page', '3')
  expectedSecondPrevParams.set('page', '1')

  expect(secondPage.result).toMatchObject({
    data: [
      {
        type: 'workorders',
        id: 'WS-76513',
        status: 'Open',
        startDate: '2024-01-03T09:00:00+00:00',
        activationDate: '2024-01-06T08:30:00+00:00',
        purpose: 'Initiate Incident Premises Spread Tracing Action',
        workArea: 'Tuberculosis',
        country: 'SCOTLAND',
        businessArea: 'Endemic Notifiable Disease',
        aim: 'Contain / Control / Eradicate Endemic Disease',
        latestActivityCompletionDate: '2024-01-01T12:00:00+00:00',
        phase: 'EXPOSURETRACKING',
        relationships: {
          customer: {
            data: { type: 'customers', id: 'C123457' }
          },
          holding: {
            data: { type: 'holdings', id: '08/139/0168' }
          },
          location: {
            data: { type: 'locations', id: 'L123457' }
          },
          facility: {
            data: { type: 'facilities', id: 'U000030' }
          },
          commodity: {
            data: null
          },
          activities: {
            data: [{ type: 'activities', id: 'test' }]
          }
        }
      }
    ],
    links: {
      next: `/workorders?${expectedSecondNextParams.toString()}`,
      prev: `/workorders?${expectedSecondPrevParams.toString()}`
    }
  })

  const secondRelationships =
    /** @type {{ relationships: Record<string, { links?: unknown }> }} */ (
      secondPage.result
    ).data[0].relationships

  for (const relationship of Object.values(secondRelationships)) {
    expect(relationship).not.toHaveProperty('links')
  }

  expect(secondPage.statusCode).toBe(200)
})

test('returns an empty page', async () => {
  const server = Hapi.server({ port: 0 })

  const queryParams = new URLSearchParams({
    startActivationDate: new Date('2024-01-01').toISOString(),
    page: '4',
    pageSize: '1',
    endActivationDate: new Date('2030-01-01').toISOString()
  })

  /**
   * create a fake simple auth strategy
   */
  server.auth.scheme('simple', () => {
    return {
      authenticate: (_request, h) => {
        return h.authenticated({ credentials: {} })
      }
    }
  })

  server.auth.strategy('simple', 'simple', {})

  server.auth.default('simple')

  server.route({
    ...route,
    path: '/workorders',
    method: 'GET'
  })

  const emptyPage = await server.inject({
    method: 'GET',
    url: `/workorders?${queryParams.toString()}`
  })

  const prevQueryParams = new URLSearchParams(queryParams.toString())

  prevQueryParams.set('page', String(3))

  expect(emptyPage.result).toMatchObject({
    data: [],
    links: {
      prev: `/workorders?${prevQueryParams.toString()}`
    }
  })

  expect(emptyPage.statusCode).toBe(200)
})

test.skip('returns an empty list if no workorders exist', async () => {
  const server = Hapi.server({ port: 0 })

  /**
   * create a fake simple auth strategy
   */
  server.auth.scheme('simple', () => {
    return {
      authenticate: (request, h) => {
        return h.authenticated({ credentials: {} })
      }
    }
  })

  server.auth.strategy('simple', 'simple', {})

  server.auth.default('simple')

  server.route({
    ...route,
    path: '/workorders',
    method: 'GET'
  })

  const res = await server.inject({
    method: 'GET',
    url: '/workorders'
  })

  expect(res.result).toMatchObject({ data: [] })

  expect(res.statusCode).toBe(200)
})

import Hapi from '@hapi/hapi'
import { test, expect, describe } from '@jest/globals'

import * as route from './workorders.js'

const path = '/workorders'

describe('Workorders', () => {
  const server = Hapi.server()

  server.route({
    ...route,
    path,
    method: 'GET'
  })

  test('returns the first page of the workorder', async () => {
    const queryParams = new URLSearchParams({
      startActivationDate: new Date('2024-01-01').toISOString(),
      page: '1',
      pageSize: '1',
      endActivationDate: new Date('2030-01-01').toISOString()
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
              data: { type: 'customers', id: 'C123456' },
              links: {
                self: '/workorders/WS-76512/relationships/customer'
              }
            },
            holding: {
              data: { type: 'holdings', id: '08/139/0167' },
              links: {
                self: '/workorders/WS-76512/relationships/holding'
              }
            },
            location: {
              data: { type: 'locations', id: 'L123456' },
              links: {
                self: '/workorders/WS-76512/relationships/location'
              }
            },
            commodity: {
              data: { type: 'commodities', id: 'U000010' },
              links: {
                self: '/workorders/WS-76512/relationships/commodity'
              }
            },
            activities: {
              links: {
                self: '/workorders/WS-76512/relationships/activities'
              }
            }
          }
        }
      ],
      links: {
        self: `/workorders?${queryParams.toString()}`,
        next: `/workorders?${expectedNextParams.toString()}`
      }
    })

    expect(firstPage.statusCode).toBe(200)

    /**
     * @type {{ links: { next: string; self: string; } }}
     */
    // @ts-expect-error - TypeScript doesn't know about the structure of the response
    const firstPageResponse = firstPage.result

    const secondPage = await server.inject({
      method: 'GET',
      url: firstPageResponse.links.next
    })

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
              data: { type: 'customers', id: 'C123457' },
              links: {
                self: '/workorders/WS-76513/relationships/customer'
              }
            },
            holding: {
              data: { type: 'holdings', id: '08/139/0168' },
              links: {
                self: '/workorders/WS-76513/relationships/holding'
              }
            },
            location: {
              data: { type: 'locations', id: 'L123457' },
              links: {
                self: '/workorders/WS-76513/relationships/location'
              }
            },
            facility: {
              data: { type: 'facilities', id: 'U000030' },
              links: {
                self: '/workorders/WS-76513/relationships/facility'
              }
            },
            activities: {
              links: {
                self: '/workorders/WS-76513/relationships/activities'
              }
            }
          }
        }
      ],
      links: {
        self: firstPageResponse.links.next,
        prev: firstPageResponse.links.self
      }
    })

    expect(secondPage.statusCode).toBe(200)
  })

  test('returns an empty page', async () => {
    const queryParams = new URLSearchParams({
      startActivationDate: new Date('2024-01-01').toISOString(),
      page: '4',
      pageSize: '1',
      endActivationDate: new Date('2030-01-01').toISOString()
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
        self: `/workorders?${queryParams.toString()}`,
        prev: `/workorders?${prevQueryParams.toString()}`
      }
    })

    expect(emptyPage.statusCode).toBe(200)
  })

  test('returns an empty list if no workorders exist in range', async () => {
    const queryParams = new URLSearchParams({
      startActivationDate: new Date('1924-01-01').toISOString(),
      page: '1',
      pageSize: '1',
      endActivationDate: new Date('1930-01-01').toISOString()
    })
    const res = await server.inject({
      method: 'GET',
      url: `${path}?${queryParams.toString()}`
    })

    expect(res.result).toMatchObject({ data: [] })

    expect(res.statusCode).toBe(200)
  })
})

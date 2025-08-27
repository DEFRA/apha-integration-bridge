import Hapi from '@hapi/hapi'
import { test, expect } from '@jest/globals'

import * as route from './workorders.js'

test('returns the mock workorder', async () => {
  const server = Hapi.server({ port: 0 })

  const queryParams = new URLSearchParams({
    startActivationDate: new Date('2024-01-01').toISOString(),
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

  const res = await server.inject({
    method: 'GET',
    url: `/workorders?${queryParams.toString()}`
  })

  expect(res.result).toMatchObject({
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
      },
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
      self: `/workorders?${queryParams.toString()}`,
      next: `/workorders?${queryParams.toString()}`
    }
  })

  expect(res.statusCode).toBe(200)
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

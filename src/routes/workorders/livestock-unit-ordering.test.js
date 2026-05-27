import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { describe, expect, test } from '@jest/globals'

import findRoute from './find.js'
import getRoute from './get.js'
import { registerSimpleAuthStrategy } from '../../common/helpers/test-helpers/simple-auth.js'
import { oracleDb } from '../../common/helpers/oracledb.js'

const findPath = '/workorders/find'
const getPath = '/workorders'

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
    ...findRoute,
    path: findPath,
    method: 'POST'
  })

  server.route({
    ...getRoute,
    path: getPath,
    method: 'GET'
  })

  return server
}

// These workorder IDs and livestock unit IDs mirror real data from the dev
// environment and are seeded by .docker-compose/oracledb/008_setup_workorders_livestock_ordering.sql.
// Each expectedOrder is ASCending lexicographic — the contract enforced by
// `ws_lu.entityid ASC` in both find-workorders.sql and get-workorders.sql.
const fixtures = [
  { id: 'WS-74193', expectedOrder: ['U104354', 'U9629'] },
  { id: 'WS-76465', expectedOrder: ['U1000004', 'U1000015', 'U1000017'] },
  { id: 'WS-76529', expectedOrder: ['U122258', 'U27318'] },
  { id: 'WS-76655', expectedOrder: ['U1006993', 'U1006994'] },
  { id: 'WS-76657', expectedOrder: ['U1006993', 'U1006994'] },
  { id: 'WS-76724', expectedOrder: ['U1007043', 'U1007044'] }
]

const fixtureIds = fixtures.map((fixture) => fixture.id)

const getQuery = new URLSearchParams({
  startActivationDate: '2026-01-01T00:00:00.000Z',
  endActivationDate: '2026-01-07T00:00:00.000Z',
  page: '1',
  pageSize: '10'
})

const findQuery = new URLSearchParams({
  page: '1',
  pageSize: '10'
})

function livestockUnitIdsFor(responseData, workorderId) {
  const workorder = responseData.find((w) => w.id === workorderId)
  if (!workorder) {
    return null
  }
  return workorder.relationships.livestockUnits.data.map(
    (relationship) => relationship.id
  )
}

describe('livestock unit ordering between GET /workorders and POST /workorders/find', () => {
  test('POST /workorders/find returns livestock units in ascending entity-id order', async () => {
    const server = await createServer()

    const response = await server.inject({
      method: 'POST',
      url: `${findPath}?${findQuery.toString()}`,
      payload: { ids: fixtureIds }
    })

    expect(response.statusCode).toBe(200)

    const data = /** @type {any} */ (response.result).data

    for (const fixture of fixtures) {
      expect(livestockUnitIdsFor(data, fixture.id)).toEqual(
        fixture.expectedOrder
      )
    }
  })

  test('GET /workorders returns livestock units in ascending entity-id order', async () => {
    const server = await createServer()

    const response = await server.inject({
      method: 'GET',
      url: `${getPath}?${getQuery.toString()}`
    })

    expect(response.statusCode).toBe(200)

    const data = /** @type {any} */ (response.result).data

    for (const fixture of fixtures) {
      expect(livestockUnitIdsFor(data, fixture.id)).toEqual(
        fixture.expectedOrder
      )
    }
  })

  test('GET and POST return livestock units in the same order for every workorder', async () => {
    const server = await createServer()

    const [postResponse, getResponse] = await Promise.all([
      server.inject({
        method: 'POST',
        url: `${findPath}?${findQuery.toString()}`,
        payload: { ids: fixtureIds }
      }),
      server.inject({
        method: 'GET',
        url: `${getPath}?${getQuery.toString()}`
      })
    ])

    expect(postResponse.statusCode).toBe(200)
    expect(getResponse.statusCode).toBe(200)

    const postData = /** @type {any} */ (postResponse.result).data
    const getData = /** @type {any} */ (getResponse.result).data

    for (const id of fixtureIds) {
      const postOrder = livestockUnitIdsFor(postData, id)
      const getOrder = livestockUnitIdsFor(getData, id)
      expect(postOrder).not.toBeNull()
      expect(getOrder).toEqual(postOrder)
    }
  })

  test('POST /workorders/find is deterministic across repeated calls', async () => {
    const server = await createServer()

    const responses = await Promise.all(
      Array.from({ length: 3 }, () =>
        server.inject({
          method: 'POST',
          url: `${findPath}?${findQuery.toString()}`,
          payload: { ids: fixtureIds }
        })
      )
    )

    const orderings = responses.map((response) =>
      fixtureIds.map((id) =>
        livestockUnitIdsFor(/** @type {any} */ (response.result).data, id)
      )
    )

    expect(orderings[1]).toEqual(orderings[0])
    expect(orderings[2]).toEqual(orderings[0])
  })

  test('GET /workorders is deterministic across repeated calls', async () => {
    const server = await createServer()

    const responses = await Promise.all(
      Array.from({ length: 3 }, () =>
        server.inject({
          method: 'GET',
          url: `${getPath}?${getQuery.toString()}`
        })
      )
    )

    const orderings = responses.map((response) =>
      fixtureIds.map((id) =>
        livestockUnitIdsFor(/** @type {any} */ (response.result).data, id)
      )
    )

    expect(orderings[1]).toEqual(orderings[0])
    expect(orderings[2]).toEqual(orderings[0])
  })
})

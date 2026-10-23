import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, expect, test } from '@jest/globals'
import hapiPino from 'hapi-pino'

import { oracleDb } from '../../../common/helpers/oracledb.js'
import { toLocations } from '../mappers/to-locations.js'
import { execute } from '../operations/execute.js'
import { findLocationsQuery } from './find-locations.js'

/**
 * Runs find-locations.sql, which every location endpoint reads, against the
 * local Oracle fixtures and counts its rows (_Location query fan-out_).
 * L298300 is seeded by
 * .docker-compose/oracledb/016_add_location_fan_out_scenario.sql
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

test('adds the rows of each address, livestock unit and holdership instead of multiplying them', async () => {
  await using oracledb = await server['oracledb.sam']()

  const rows = await execute(
    oracledb.connection,
    findLocationsQuery(['L298300'])
  )

  const [location] = toLocations(rows, ['L298300'])

  // 3 addresses + 20 livestock units + 20 holderships, not 2 × 3 × 20 × 20
  expect(rows.length).toBe(43)
  // the mappers take the address from the first row
  expect(rows[0].address_rank).toBe(1)
  expect(location.livestockUnits).toHaveLength(20)
  expect(location.relationships.holdings.data).toHaveLength(20)
})

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import oracledb from 'oracledb'

import { config } from '../../../config.js'
import {
  paginateWorkorders,
  paginateWorkordersQuery
} from './paginate-workorders.js'

test('returns the expected query for valid parameters', () => {
  const { sql } = paginateWorkordersQuery({
    startActivationDate: '2024-01-01T00:00:00.000Z',
    endActivationDate: '2024-02-01T00:00:00.000Z',
    page: 1,
    pageSize: 10
  })

  expect(sql).toMatchSnapshot()
})

test('throws if query parameters are invalid', () => {
  expect(() =>
    paginateWorkordersQuery({
      startActivationDate: 'not-a-date',
      endActivationDate: '2024-02-01T00:00:00.000Z',
      page: 1,
      pageSize: 10
    })
  ).toThrow(/invalid parameters/i)
})

test('throws when endActivationDate is before startActivationDate', () => {
  expect(() =>
    paginateWorkordersQuery({
      startActivationDate: '2024-02-01T00:00:00.000Z',
      endActivationDate: '2024-01-01T00:00:00.000Z',
      page: 1,
      pageSize: 10
    })
  ).toThrow(/end activation date must be after start activation date/i)
})

test('throws when page and pageSize are invalid', () => {
  expect(() =>
    paginateWorkordersQuery({
      startActivationDate: '2024-01-01T00:00:00.000Z',
      endActivationDate: '2024-02-01T00:00:00.000Z',
      page: 0,
      pageSize: 100
    })
  ).toThrow(/invalid parameters/i)
})

describe('paginateWorkorders', () => {
  /** @type {import('oracledb').Connection} */
  let connection

  beforeAll(async () => {
    const samConfig = config.get('oracledb').sam

    connection = await oracledb.getConnection({
      user: samConfig.username,
      password: samConfig.password,
      connectString: `${samConfig.host}/${samConfig.dbname}`
    })
  })

  afterAll(async () => {
    await connection.close()
  })

  test('returns page-limited workorders and hasMore when extra rows exist', async () => {
    const result = await paginateWorkorders(connection, {
      startActivationDate: '2014-05-01T00:00:00.000Z',
      endActivationDate: '2014-07-01T00:00:00.000Z',
      page: 1,
      pageSize: 1
    })

    expect(result.hasMore).toBe(true)
    expect(result.workorders).toHaveLength(1)
    expect(result.workorders[0].id).toBe('WS-43')
  })

  test('returns final page with hasMore false', async () => {
    const result = await paginateWorkorders(connection, {
      startActivationDate: '2014-05-01T00:00:00.000Z',
      endActivationDate: '2014-07-01T00:00:00.000Z',
      page: 3,
      pageSize: 1
    })

    expect(result.hasMore).toBe(false)
    expect(result.workorders).toHaveLength(1)
    expect(result.workorders[0].id).toBe('WS-1531')
  })
})

import { describe, expect, jest, test } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import * as dbOperations from '../operations/execute.js'
import {
  DISCOVERY_DATASET_KEYS,
  samDiscovery,
  samDiscoveryQuery
} from './sam-discovery.js'

describe.each(DISCOVERY_DATASET_KEYS)('dataset %s', (dataset) => {
  const { sql, bindings } = samDiscoveryQuery({ dataset })

  test('loads a non-empty SELECT with no bind variables', () => {
    expect(sql.trim()).toMatch(/^SELECT/i)
    expect(placeholdersIn(sql)).toEqual([])
    expect(bindings).toEqual({})
  })

  test('is read-only and aggregate', () => {
    expect(sql).not.toMatch(
      /\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|TRUNCATE)\b/i
    )
    expect(sql).toMatch(/\bGROUP BY\b|\bahbrp\.role r\b/i)
  })

  test('only reads the AHBRP schema', () => {
    const tables = [...sql.matchAll(/\b(?:FROM|JOIN)\s+([a-z_.]+)/gi)].map(
      (m) => m[1].toLowerCase()
    )
    expect(tables.length).toBeGreaterThan(0)
    for (const table of tables) {
      expect(table.startsWith('ahbrp.')).toBe(true)
    }
  })
})

test('rejects an unknown dataset before touching the database', () => {
  expect(() => samDiscoveryQuery({ dataset: 'party_names' })).toThrow(
    /invalid/i
  )
})

test('samDiscovery returns the driver rows unchanged', async () => {
  const rows = [{ main_role_type: 'SUPPLIER', role_type: 'OVPRACTICE' }]

  jest.spyOn(dbOperations, 'execute').mockResolvedValue(rows)

  await expect(
    samDiscovery(/** @type {any} */ ({}), { dataset: 'roles' })
  ).resolves.toBe(rows)
})

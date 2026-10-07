import { describe, expect, jest, test } from '@jest/globals'

import { placeholdersIn } from '../../../common/helpers/test-helpers/bind-placeholders.js'
import * as dbOperations from '../operations/execute.js'
import {
  HPAI_DISCOVERY_DATASET_KEYS,
  HPAI_DISCOVERY_DATASETS,
  HpaiDiscoveryDatasetsSchema,
  describeDatasetError,
  hpaiDiscoveryQuery,
  runHpaiDiscovery
} from './hpai-discovery.js'

const CATALOGUE_VIEWS = ['all_tab_columns', 'all_ind_columns', 'all_indexes']

/**
 * Columns that hold names, addresses or contact values. No dataset may read
 * them, not even inside an aggregate.
 */
const PERSONAL_DATA_COLUMNS = [
  'person_title',
  'person_given_name',
  'person_given_name2',
  'person_family_name',
  'person_initials',
  'organisation_name',
  'primary_contact_full_name',
  'secondary_contact_full_name',
  'feature_name',
  'street',
  'locality',
  'town',
  'postcode',
  'paon_description',
  'saon_description',
  'internet_email_address',
  'mobile_number',
  'telephone_number',
  'fax_number',
  'date_of_birth'
]

/**
 * @param {string} sql
 */
const withoutComments = (sql) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '')

/**
 * Names introduced by `WITH name AS (` or `, name AS (`.
 *
 * @param {string} sql
 */
const cteNames = (sql) =>
  [...sql.matchAll(/(?:\bWITH|,)\s*([a-z_][a-z0-9_]*)\s+AS\s*\(/gi)].map(
    (match) => match[1].toLowerCase()
  )

/**
 * The identifiers that follow FROM or JOIN (inline views start with "(" and
 * are skipped).
 *
 * @param {string} sql
 */
const sourcesOf = (sql) =>
  [...sql.matchAll(/\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_$.]*)/gi)].map((match) =>
    match[1].toLowerCase()
  )

describe.each(HPAI_DISCOVERY_DATASET_KEYS)('dataset %s', (dataset) => {
  const { kind } = HPAI_DISCOVERY_DATASETS[dataset]
  const { sql, bindings } = hpaiDiscoveryQuery(dataset)
  const code = withoutComments(sql)

  test('is a single read-only query with no bind variables', () => {
    expect(code.trim()).toMatch(/^(SELECT|WITH)\b/i)
    expect(code).not.toMatch(
      /\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|TRUNCATE|CREATE|GRANT|EXECUTE|BEGIN)\b/i
    )
    expect(code).not.toMatch(/;\s*\S/)
    expect(placeholdersIn(sql)).toEqual([])
    expect(bindings).toEqual({})
  })

  test('reads only the AHBRP schema, its own CTEs or the data dictionary', () => {
    const ctes = cteNames(code)
    const sources = sourcesOf(code)

    expect(sources.length).toBeGreaterThan(0)

    for (const source of sources) {
      if (source.includes('.')) {
        expect(source.startsWith('ahbrp.')).toBe(true)
      } else {
        expect([...ctes, ...CATALOGUE_VIEWS]).toContain(source)
      }
    }
  })

  test(`matches its "${kind}" kind`, () => {
    const sources = sourcesOf(code)

    if (kind === 'catalogue') {
      expect(sources.every((source) => CATALOGUE_VIEWS.includes(source))).toBe(
        true
      )
    } else if (kind === 'reference') {
      expect(
        sources.every((source) => source.startsWith('ahbrp.ref_data_'))
      ).toBe(true)
    } else {
      expect(code).toMatch(/\bGROUP BY\b/i)
    }
  })

  test('never reads a name, address or contact value', () => {
    for (const column of PERSONAL_DATA_COLUMNS) {
      expect(code).not.toMatch(new RegExp(`\\b${column}\\b`, 'i'))
    }

    if (/\bparty_id\b/i.test(code)) {
      expect(dataset).toBe('party-id-formats')
    }
  })
})

test('every dataset describes the question it answers', () => {
  for (const key of HPAI_DISCOVERY_DATASET_KEYS) {
    const { kind, description, answers } = HPAI_DISCOVERY_DATASETS[key]

    expect(['catalogue', 'reference', 'scan']).toContain(kind)
    expect(description.length).toBeGreaterThan(10)
    expect(answers.length).toBeGreaterThan(10)
  }
})

describe('HpaiDiscoveryDatasetsSchema', () => {
  test('accepts comma-separated and repeated names, de-duplicated in order', () => {
    const { value, error } = HpaiDiscoveryDatasetsSchema.validate([
      'columns,indexes',
      'columns',
      ' feature-types '
    ])

    expect(error).toBeUndefined()
    expect(value).toEqual(['columns', 'indexes', 'feature-types'])
  })

  test('accepts a single name', () => {
    expect(HpaiDiscoveryDatasetsSchema.validate('columns').value).toEqual([
      'columns'
    ])
  })

  test('names every unknown dataset', () => {
    const { error } = HpaiDiscoveryDatasetsSchema.validate(
      'columns,party_names,emails'
    )

    expect(error?.message).toContain('party_names, emails')
  })
})

test('hpaiDiscoveryQuery rejects an unknown dataset', () => {
  expect(() => hpaiDiscoveryQuery('party_names')).toThrow(/unknown/i)
})

describe('describeDatasetError', () => {
  test('keeps the code and the first line of the message', () => {
    const error = Object.assign(
      new Error(
        'ORA-00942: table or view "AHBRP"."ROLE" does not exist\nHelp: https://docs.oracle.com/error-help/db/ora-00942/'
      ),
      { code: 'ORA-00942' }
    )

    expect(describeDatasetError(error)).toEqual({
      code: 'ORA-00942',
      message: 'ORA-00942: table or view "AHBRP"."ROLE" does not exist'
    })
  })

  test('copes with an error that has no code', () => {
    expect(describeDatasetError(new Error('boom'))).toEqual({
      code: 'UNKNOWN',
      message: 'boom'
    })
  })
})

describe('runHpaiDiscovery', () => {
  /**
   * A clock that advances by `step` milliseconds on every call.
   *
   * @param {number} step
   */
  const steppingClock = (step) => {
    let time = 0

    return () => {
      time += step

      return time
    }
  }

  test('runs each dataset with its own call timeout and returns its rows', async () => {
    const connection = /** @type {any} */ ({ callTimeout: 5000 })
    const timeouts = []

    jest.spyOn(dbOperations, 'execute').mockImplementation(async (conn) => {
      timeouts.push(conn.callTimeout)

      return [{ feature_type: 'PREMISES', features: 3 }]
    })

    const results = await runHpaiDiscovery(connection, ['feature-types'], {
      now: steppingClock(1)
    })

    expect(timeouts).toEqual([20_000])
    expect(results).toEqual([
      expect.objectContaining({
        dataset: 'feature-types',
        kind: 'scan',
        rowCount: 1,
        rows: [{ feature_type: 'PREMISES', features: 3 }],
        error: null
      })
    ])
  })

  test('reports a failing dataset and still runs the next one', async () => {
    jest
      .spyOn(dbOperations, 'execute')
      .mockRejectedValueOnce(
        Object.assign(
          new Error(
            'ORA-00904: "O"."ORGANISATIONAL_UNIT_TYPE": invalid identifier'
          ),
          {
            code: 'ORA-00904'
          }
        )
      )
      .mockResolvedValueOnce([{ table_name: 'FEATURE' }])

    const results = await runHpaiDiscovery(
      /** @type {any} */ ({}),
      ['organisation-attributes', 'columns'],
      { now: steppingClock(1) }
    )

    expect(
      results.map((result) => [result.dataset, result.error?.code])
    ).toEqual([
      ['organisation-attributes', 'ORA-00904'],
      ['columns', undefined]
    ])
    expect(results[1].rows).toEqual([{ table_name: 'FEATURE' }])
  })

  test('caps the call timeout at what is left of the budget, then skips', async () => {
    const connection = /** @type {any} */ ({})
    const timeouts = []

    jest.spyOn(dbOperations, 'execute').mockImplementation(async (conn) => {
      timeouts.push(conn.callTimeout)

      return []
    })

    // every clock read advances 10s against a 25s budget
    const results = await runHpaiDiscovery(
      connection,
      ['columns', 'indexes', 'feature-types'],
      {
        budgetMs: 25_000,
        perDatasetTimeoutMs: 20_000,
        now: steppingClock(10_000)
      }
    )

    expect(timeouts).toEqual([15_000])
    expect(results.map((result) => result.error?.code ?? 'OK')).toEqual([
      'OK',
      'SKIPPED',
      'SKIPPED'
    ])
  })

  test('counts the budget from startedAt when the caller passes it', async () => {
    const connection = /** @type {any} */ ({})
    const timeouts = []

    jest.spyOn(dbOperations, 'execute').mockImplementation(async (conn) => {
      timeouts.push(conn.callTimeout)

      return []
    })

    // 30s already spent waiting for a connection, against a 40s budget
    await runHpaiDiscovery(connection, ['columns'], {
      startedAt: 0,
      now: () => 30_000
    })

    expect(timeouts).toEqual([10_000])
  })
})

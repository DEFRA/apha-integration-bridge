import { describe, expect, test } from '@jest/globals'

import { findInMemo } from '../validate.js'
import { cases } from './cases.js'
import { heldOutCases } from './held-out-cases.js'
import { percentile, scoreRun, summarise, unstableCases } from './score.js'

/**
 * @param {import('../index.js').MemoContactsStatus} status
 * @param {Array<[string, string | null]>} [contacts]
 * @returns {import('../index.js').MemoContacts}
 */
const result = (status, contacts = []) => ({
  status,
  reasonCode: 'X',
  contacts: contacts.map(([name, role]) => ({
    name,
    role,
    sourceMatch: 'exact'
  })),
  meta: {
    modelId: 'm',
    promptVersion: '1',
    schemaVersion: '1',
    policyVersion: '1'
  }
})

/** @type {import('./cases.js').MemoCase} */
const memoCase = {
  id: 'c1',
  category: 'test',
  memo: 'unused',
  expectedStatus: 'found',
  expectedNames: [['Mr Ravi Menon', 'Mr Ravi Menon MRCVS'], 'Agnes Thwaite'],
  expectedRoles: { 'Mr Ravi Menon': 'vet' }
}

describe('scoreRun', () => {
  test('passes an exact answer and checks listed roles', () => {
    expect(
      scoreRun(
        memoCase,
        result('found', [
          ['Mr Ravi Menon MRCVS', 'vet'],
          ['agnes thwaite', null]
        ])
      )
    ).toEqual({
      statusCorrect: true,
      unavailable: false,
      truePositives: 2,
      falsePositives: 0,
      falseNegatives: 0,
      rolesChecked: 1,
      rolesCorrect: 1,
      pass: true
    })
  })

  test('counts missing and extra names, and a wrong role, without failing on the role', () => {
    const score = scoreRun(
      memoCase,
      result('found', [
        ['Mr Ravi Menon', 'other'],
        ['JS', null]
      ])
    )

    expect(score).toMatchObject({
      truePositives: 1,
      falsePositives: 1,
      falseNegatives: 1,
      rolesChecked: 1,
      rolesCorrect: 0,
      pass: false
    })
  })

  test('accepts any of several statuses', () => {
    expect(
      scoreRun(
        {
          ...memoCase,
          expectedStatus: ['none', 'ambiguous'],
          expectedNames: []
        },
        result('ambiguous')
      )
    ).toMatchObject({ statusCorrect: true, pass: true })
  })

  test('ambiguousCandidates are allowed on an ambiguous run only', () => {
    const familyCase = {
      ...memoCase,
      expectedStatus: /** @type {const} */ (['none', 'ambiguous']),
      expectedNames: [],
      ambiguousCandidates: ['Openshaw family']
    }

    expect(
      scoreRun(familyCase, result('ambiguous', [['Openshaw family', null]]))
    ).toMatchObject({ falsePositives: 0, pass: true })
    expect(
      scoreRun(familyCase, result('ambiguous', [['Someone Else', null]]))
    ).toMatchObject({ falsePositives: 1, pass: false })
    expect(
      scoreRun(
        { ...familyCase, expectedStatus: ['found', 'none', 'ambiguous'] },
        result('found', [['Openshaw family', 'previous_contact']])
      )
    ).toMatchObject({ falsePositives: 1, pass: false })
  })

  test('unavailable never passes and scores no names', () => {
    expect(scoreRun(memoCase, result('unavailable'))).toMatchObject({
      unavailable: true,
      truePositives: 0,
      falseNegatives: 0,
      pass: false
    })
  })

  test('scoreNames false checks the status only', () => {
    expect(
      scoreRun(
        { ...memoCase, scoreNames: false },
        result('found', [['Someone Else', null]])
      )
    ).toMatchObject({ falsePositives: 0, falseNegatives: 0, pass: true })
  })
})

describe('summarise and unstableCases', () => {
  /**
   * @param {string} caseId
   * @param {import('../index.js').MemoContacts} memoContacts
   * @param {number} latencyMs
   */
  const run = (caseId, memoContacts, latencyMs) => ({
    caseId,
    category: 'test',
    repeat: 0,
    memoContacts,
    diagnostics: {
      latencyMs,
      usage: { inputTokens: 100, outputTokens: 10 },
      droppedNames: 0
    },
    score: scoreRun(memoCase, memoContacts)
  })

  const good = result('found', [
    ['Mr Ravi Menon', 'vet'],
    ['Agnes Thwaite', null]
  ])
  const missing = result('found', [['Mr Ravi Menon', 'vet']])

  test('summarises pass rate, precision, recall, latency and tokens', () => {
    expect(summarise([run('a', good, 100), run('a', missing, 300)])).toEqual({
      runs: 2,
      passRate: 0.5,
      statusAccuracy: 1,
      namePrecision: 1,
      nameRecall: 0.75,
      roleAccuracy: 1,
      unavailable: 0,
      namesDropped: 0,
      latencyP50Ms: 100,
      latencyP95Ms: 300,
      inputTokens: 200,
      outputTokens: 20
    })
  })

  test('flags a case whose answer changes between repeats', () => {
    expect(
      unstableCases([
        run('a', good, 1),
        run('a', missing, 1),
        run('b', good, 1),
        run('b', good, 1)
      ])
    ).toEqual(['a'])
  })

  test('percentile of nothing is null', () => {
    expect(percentile([], 0.5)).toBeNull()
  })
})

describe.each([
  ['development', cases],
  ['held-out', heldOutCases]
])('%s cases', (_, set) => {
  test('ids are unique', () => {
    const ids = set.map((memoCase) => memoCase.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every role label refers to an expected name', () => {
    for (const memoCase of set) {
      const primaries = memoCase.expectedNames.map((name) =>
        Array.isArray(name) ? name[0] : name
      )

      for (const name of Object.keys(memoCase.expectedRoles ?? {})) {
        expect(primaries).toContain(name)
      }
    }
  })

  // The validator drops any name not in the memo, so a label naming one
  // could never pass.
  test('every expected name and candidate can be found in its memo', () => {
    for (const memoCase of set.filter(({ knownGap }) => !knownGap)) {
      for (const name of [
        ...memoCase.expectedNames.flat(),
        ...(memoCase.ambiguousCandidates ?? [])
      ]) {
        expect([memoCase.id, findInMemo(name, memoCase.memo)]).not.toEqual([
          memoCase.id,
          null
        ])
      }
    }
  })

  test('every memo is short enough to be sent', () => {
    for (const memoCase of set) {
      expect(memoCase.memo.length).toBeLessThanOrEqual(4000)
    }
  })
})

test('the held-out set shares no ids with the development set', () => {
  const devIds = new Set(cases.map((memoCase) => memoCase.id))

  expect(heldOutCases.filter((memoCase) => devIds.has(memoCase.id))).toEqual([])
})

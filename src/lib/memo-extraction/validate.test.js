import { describe, expect, test } from '@jest/globals'

import {
  MAX_CONTACTS,
  findInMemo,
  normaliseName,
  validateModelOutput
} from './validate.js'

/**
 * @param {Partial<import('./schema.js').ModelOutput>} output
 * @returns {import('./schema.js').ModelOutput}
 */
const modelOutput = (output) => ({
  status: 'found',
  reasonCode: 'SINGLE_PERSON',
  persons: [],
  ...output
})

describe('normaliseName', () => {
  test('folds case, punctuation, apostrophes, dashes and whitespace', () => {
    expect(normaliseName('  Mr. J.  O’Neill–Smith, ')).toBe(
      "mr j o'neill-smith"
    )
  })
})

describe('findInMemo', () => {
  test('exact when the name appears as written', () => {
    expect(findInMemo('Mrs P Okafor', 'Contact Mrs P Okafor (owner)')).toBe(
      'exact'
    )
  })

  test('normalised when only case or punctuation differ', () => {
    expect(findInMemo('R Banerjee', 'Visit by AO R. BANERJEE.')).toBe(
      'normalised'
    )
  })

  test('null when the name is not in the memo', () => {
    expect(findInMemo('John Smith', 'Contact J Smith')).toBeNull()
  })

  test('matches whole words only', () => {
    expect(findInMemo('ann', 'Spoke to Joanna')).toBeNull()
  })

  test('null for a blank name', () => {
    expect(findInMemo(' ', 'anything')).toBeNull()
  })
})

describe('validateModelOutput', () => {
  const memo =
    'Agent Gwen Pritchard; stockman Tomasz. Ring Gwen Pritchard first.'

  test('keeps verified names with their match quality and role', () => {
    const result = validateModelOutput(
      modelOutput({
        reasonCode: 'MULTIPLE_PEOPLE',
        persons: [
          { name: 'Gwen Pritchard', role: 'agent' },
          { name: 'tomasz', role: 'keeper' }
        ]
      }),
      memo
    )

    expect(result).toEqual({
      status: 'found',
      reasonCode: 'MULTIPLE_PEOPLE',
      contacts: [
        { name: 'Gwen Pritchard', role: 'agent', sourceMatch: 'exact' },
        { name: 'tomasz', role: 'keeper', sourceMatch: 'normalised' }
      ],
      droppedNames: 0
    })
  })

  test('removes duplicates of the same name', () => {
    const result = validateModelOutput(
      modelOutput({
        persons: [
          { name: 'Gwen Pritchard', role: 'agent' },
          { name: 'GWEN PRITCHARD', role: null }
        ]
      }),
      memo
    )

    expect(result.contacts).toHaveLength(1)
    expect(result.status).toBe('found')
  })

  test('a name not in the memo makes the whole result ambiguous', () => {
    const result = validateModelOutput(
      modelOutput({
        persons: [
          { name: 'Gwen Pritchard', role: 'agent' },
          { name: 'Gwendolyn Pritchard', role: 'agent' }
        ]
      }),
      memo
    )

    expect(result).toMatchObject({
      status: 'ambiguous',
      reasonCode: 'UNVERIFIED_NAMES',
      droppedNames: 1
    })
    expect(result.contacts.map((contact) => contact.name)).toEqual([
      'Gwen Pritchard'
    ])
  })

  test('passes "none" through with no contacts', () => {
    expect(
      validateModelOutput(
        modelOutput({ status: 'none', reasonCode: 'NO_PERSON_NAMED' }),
        memo
      )
    ).toEqual({
      status: 'none',
      reasonCode: 'NO_PERSON_NAMED',
      contacts: [],
      droppedNames: 0
    })
  })

  test('"none" with people listed is inconsistent', () => {
    expect(
      validateModelOutput(
        modelOutput({
          status: 'none',
          reasonCode: 'NO_PERSON_NAMED',
          persons: [{ name: 'Tomasz', role: null }]
        }),
        memo
      )
    ).toMatchObject({ status: 'ambiguous', reasonCode: 'INCONSISTENT_OUTPUT' })
  })

  test('"found" with nobody listed is inconsistent', () => {
    expect(
      validateModelOutput(modelOutput({ status: 'found' }), memo)
    ).toMatchObject({ status: 'ambiguous', reasonCode: 'INCONSISTENT_OUTPUT' })
  })

  test('passes "ambiguous" through with its candidates', () => {
    expect(
      validateModelOutput(
        modelOutput({
          status: 'ambiguous',
          reasonCode: 'UNCLEAR_IF_PERSON',
          persons: [{ name: 'Tomasz', role: null }]
        }),
        memo
      )
    ).toMatchObject({
      status: 'ambiguous',
      reasonCode: 'UNCLEAR_IF_PERSON',
      contacts: [{ name: 'Tomasz', role: null, sourceMatch: 'exact' }]
    })
  })

  test(`more than ${MAX_CONTACTS} people is ambiguous with no contacts`, () => {
    const names = Array.from(
      { length: MAX_CONTACTS + 1 },
      (_, i) => `Person${i}`
    )

    expect(
      validateModelOutput(
        modelOutput({
          reasonCode: 'MULTIPLE_PEOPLE',
          persons: names.map((name) => ({ name, role: null }))
        }),
        names.join(', ')
      )
    ).toMatchObject({
      status: 'ambiguous',
      reasonCode: 'TOO_MANY_NAMES',
      contacts: []
    })
  })
})

import { describe, expect, test } from '@jest/globals'

import { createBaselineModel, isBaseline } from './index.js'
import { findNamesByNer } from './ner.js'
import { findNamesByRules } from './rules.js'

describe('findNamesByRules', () => {
  test('finds a name after a title, with its initials', () => {
    expect(findNamesByRules('Queries to Mrs D. M. Atherton please.')).toEqual([
      { name: 'Mrs D. M. Atherton', role: null }
    ])
  })

  test('finds a name after a cue word and takes its role from the cue', () => {
    expect(
      findNamesByRules('Agent: Gwen Pritchard. Stockman is Tomasz.')
    ).toEqual([
      { name: 'Gwen Pritchard', role: 'agent' },
      { name: 'Tomasz', role: 'keeper' }
    ])
  })

  test('keeps the titled form and the cue role when both match one person', () => {
    expect(findNamesByRules('Owner Mr Hughes, ring after 6.')).toEqual([
      { name: 'Mr Hughes', role: 'owner' }
    ])
  })

  test('ignores places and organisations after a cue', () => {
    expect(
      findNamesByRules('Contact Rose Farm office. Vet Hillside Vets.')
    ).toEqual([])
  })

  test('ignores a cue followed by a lower-case word', () => {
    expect(findNamesByRules('Contact details updated 2021.')).toEqual([])
  })

  test('returns nothing for a memo with no names', () => {
    expect(findNamesByRules('TB test clear. 118 cattle.')).toEqual([])
  })
})

describe('findNamesByNer', () => {
  test('returns the people compromise recognises, without trailing punctuation', () => {
    const names = findNamesByNer('Spoke to Mrs Doreen Atherton, then Tomasz.')

    expect(names).toContainEqual({ name: 'Mrs Doreen Atherton', role: null })
    expect(names).toContainEqual({ name: 'Tomasz', role: null })
  })

  test('returns each name once', () => {
    const names = findNamesByNer('Tomasz called. Tomasz called again.')

    expect(names.filter(({ name }) => name === 'Tomasz')).toHaveLength(1)
  })
})

describe('createBaselineModel', () => {
  const signal = new AbortController().signal

  test('knows only the baseline ids', () => {
    expect(isBaseline('baseline:rules')).toBe(true)
    expect(isBaseline('baseline:ner')).toBe(true)
    expect(isBaseline('claude-haiku-5-5')).toBe(false)
  })

  test('answers none when no names are found', async () => {
    const { output, usage } = await createBaselineModel(
      'baseline:rules'
    ).extract('TB test clear.', { signal })

    expect(output).toEqual({
      status: 'none',
      reasonCode: 'NO_PERSON_NAMED',
      persons: []
    })
    expect(usage).toBeNull()
  })

  test('answers found with the right reason code for one or more names', async () => {
    const model = createBaselineModel('baseline:rules')

    expect(
      (await model.extract('Contact Mr Hughes.', { signal })).output
    ).toMatchObject({ status: 'found', reasonCode: 'SINGLE_PERSON' })
    expect(
      (await model.extract('Mr Hughes and Mrs Okafor.', { signal })).output
    ).toMatchObject({ status: 'found', reasonCode: 'MULTIPLE_PEOPLE' })
  })
})

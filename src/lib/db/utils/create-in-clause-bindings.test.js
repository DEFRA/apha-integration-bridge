import { expect, test } from '@jest/globals'

import { createInClauseBindings } from './create-in-clause-bindings.js'

test('returns placeholders and bindings for values', () => {
  const values = ['C123456', 'C234567']

  expect(createInClauseBindings(values)).toEqual({
    placeholders: ':id0, :id1',
    bindings: {
      id0: 'C123456',
      id1: 'C234567'
    }
  })
})

test('returns empty placeholders and bindings for empty array', () => {
  expect(createInClauseBindings([])).toEqual({
    placeholders: '',
    bindings: {}
  })
})

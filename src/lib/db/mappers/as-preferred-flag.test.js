import { expect, test } from '@jest/globals'

import { asPreferredFlag } from './as-preferred-flag.js'

test('asPreferredFlag coerces booleans, numerics and truthy strings', () => {
  expect(asPreferredFlag(true)).toBe(true)
  expect(asPreferredFlag(1)).toBe(true)
  expect(asPreferredFlag('Y')).toBe(true)
  expect(asPreferredFlag('yes')).toBe(true)
  expect(asPreferredFlag('TRUE')).toBe(true)
  expect(asPreferredFlag('1')).toBe(true)
  expect(asPreferredFlag('N')).toBe(false)
  expect(asPreferredFlag(0)).toBe(false)
  expect(asPreferredFlag(null)).toBe(false)
})

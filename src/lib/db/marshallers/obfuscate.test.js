import { describe, test, expect } from '@jest/globals'

// obfuscate.test.js
import { obfuscate } from './obfuscate.js'

describe('obfuscate()', () => {
  describe('non-string inputs', () => {
    const values = [
      123,
      0,
      -42,
      true,
      false,
      null,
      undefined,
      { foo: 'bar' },
      [1, 2, 3],
      Symbol('sym')
    ]

    values.forEach((val) => {
      test(`returns ${String(val)} (type ${typeof val}) unchanged`, () => {
        expect(obfuscate(val)).toBe(val)
      })
    })
  })

  describe('string inputs shorter than 2 characters', () => {
    test('throws RangeError for empty string', () => {
      expect(() => obfuscate('')).toThrow(RangeError)
    })

    test('throws RangeError for 1-character string', () => {
      expect(() => obfuscate('A')).toThrow(RangeError)
    })
  })

  describe('string inputs of length 2–4 (visible=2)', () => {
    test('length=2 returns the same string (no asterisks)', () => {
      expect(obfuscate('ab')).toBe('ab')
    })

    test('length=3 replaces first char with asterisk', () => {
      // '*' + last 2 chars
      expect(obfuscate('abc')).toBe('*bc')
    })

    test('length=4 replaces first two chars with asterisks', () => {
      expect(obfuscate('abcd')).toBe('**cd')
    })
  })

  describe('string inputs of length ≥5 (visible=4)', () => {
    test('length=5 replaces first char with one asterisk + last 4', () => {
      expect(obfuscate('abcde')).toBe('*bcde')
    })

    test('length=6 replaces first two chars with asterisks + last 4', () => {
      expect(obfuscate('abcdef')).toBe('**cdef')
    })

    test('length=10 replaces first six chars with asterisks + last 4', () => {
      expect(obfuscate('0123456789')).toBe('******6789')
    })

    test('long random string', () => {
      const str = 'LoremIpsumDolorSitAmet'
      const expected = '*'.repeat(str.length - 4) + str.slice(-4)
      expect(obfuscate(str)).toBe(expected)
    })
  })
})

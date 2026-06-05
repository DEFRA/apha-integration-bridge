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

  describe('short strings (length ≤ visible window) are fully masked', () => {
    test('empty string returns empty string without throwing', () => {
      expect(obfuscate('')).toBe('')
    })

    test('length=1 is fully masked (no RangeError, no leak)', () => {
      expect(obfuscate('A')).toBe('*')
    })

    test('whitespace 1-character string is fully masked', () => {
      expect(obfuscate(' ')).toBe('*')
    })

    test('length=2 is fully masked rather than returned in clear', () => {
      expect(obfuscate('ab')).toBe('**')
    })

    test('fully-masked output never contains any original character', () => {
      for (const value of ['', 'A', ' ', 'ab', 'Z9']) {
        expect(obfuscate(value)).toBe('*'.repeat(value.length))
      }
    })
  })

  describe('string inputs of length 3–4 (visible=2)', () => {
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

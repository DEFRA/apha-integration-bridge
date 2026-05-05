import { describe, expect, test } from '@jest/globals'

import { enterMaskingContext, mask, runWithMaskingContext } from './index.js'

describe('mask', () => {
  test('passes through when no masking context is set', () => {
    expect(mask('John Smith')).toBe('John Smith')
  })

  test('passes through when shouldMask is false', () => {
    runWithMaskingContext({ shouldMask: false }, () => {
      expect(mask('John Smith')).toBe('John Smith')
    })
  })

  test('passes through null, undefined and empty string', () => {
    runWithMaskingContext({ shouldMask: true }, () => {
      expect(mask(null)).toBeNull()

      expect(mask(undefined)).toBeUndefined()

      expect(mask('')).toBe('')
    })
  })

  test('fully masks strings of length 5 or less', () => {
    runWithMaskingContext({ shouldMask: true }, () => {
      expect(mask('A')).toBe('*')

      expect(mask('Mr')).toBe('**')

      expect(mask('Bert')).toBe('****')

      expect(mask('Smith')).toBe('*****')
    })
  })

  test('preserves first and last character of strings longer than 5', () => {
    runWithMaskingContext({ shouldMask: true }, () => {
      expect(mask('Smithy')).toBe('S****y')

      expect(mask('John Smith')).toBe('J********h')

      expect(mask('SW1A 1AA')).toBe('S******A')

      expect(mask('Acacia Avenue')).toBe('A***********e')
    })
  })

  test('treats spaces as regular characters in the mask region', () => {
    runWithMaskingContext({ shouldMask: true }, () => {
      expect(mask('42 Acacia Avenue')).toBe('4**************e')
    })
  })

  test('masks an email and a phone number using the same rule', () => {
    runWithMaskingContext({ shouldMask: true }, () => {
      expect(mask('john.smith@example.com')).toBe('j********************m')

      expect(mask('07700900123')).toBe('0*********3')
    })
  })
})

describe('enterMaskingContext', () => {
  test('sets the masking context for the rest of the current async chain', async () => {
    await runWithMaskingContext({ shouldMask: false }, async () => {
      expect(mask('John')).toBe('John')

      // Re-enter with a different value within a fresh async tick.
      await new Promise((resolve) => setImmediate(resolve))

      enterMaskingContext({ shouldMask: true })

      expect(mask('John')).toBe('****')
    })
  })

  test('contexts in concurrent async chains do not leak into each other', async () => {
    const masked = runWithMaskingContext({ shouldMask: true }, async () => {
      await new Promise((resolve) => setImmediate(resolve))

      return mask('John')
    })

    const unmasked = runWithMaskingContext({ shouldMask: false }, async () => {
      await new Promise((resolve) => setImmediate(resolve))

      return mask('John')
    })

    const [a, b] = await Promise.all([masked, unmasked])

    expect(a).toBe('****')

    expect(b).toBe('John')
  })
})

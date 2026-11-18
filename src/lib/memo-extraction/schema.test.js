import { describe, expect, test } from '@jest/globals'

import { ModelOutputSchema } from './schema.js'

const valid = {
  status: 'found',
  reasonCode: 'SINGLE_PERSON',
  persons: [{ name: 'Jean Whitlock', role: 'contact' }]
}

describe('ModelOutputSchema', () => {
  test('accepts an answer with exactly the expected fields', () => {
    expect(ModelOutputSchema.safeParse(valid).success).toBe(true)
  })

  test('rejects an unexpected top-level field rather than dropping it', () => {
    const result = ModelOutputSchema.safeParse({ ...valid, confidence: 0.9 })

    expect(result.success).toBe(false)
  })

  test('rejects an unexpected field on a person', () => {
    const result = ModelOutputSchema.safeParse({
      ...valid,
      persons: [{ name: 'Jean Whitlock', role: 'contact', phone: '01234' }]
    })

    expect(result.success).toBe(false)
  })

  test('rejects a role outside the list', () => {
    const result = ModelOutputSchema.safeParse({
      ...valid,
      persons: [{ name: 'Jean Whitlock', role: 'neighbour' }]
    })

    expect(result.success).toBe(false)
  })
})

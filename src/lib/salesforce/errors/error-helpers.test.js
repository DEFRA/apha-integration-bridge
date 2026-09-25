import { describe, expect, test } from '@jest/globals'
import { salesforceTaggedError } from './error-helpers.js'

describe('salesforceTaggedError', () => {
  test('creates an error with the supplied message', () => {
    const error = salesforceTaggedError('Something went wrong')

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Something went wrong')
  })

  test('tags the error with the Salesforce operation', () => {
    const error = salesforceTaggedError('Something went wrong', 'createContact')

    expect(error.operation).toBe('createContact')
  })

  test('does not add an operation when one is not supplied', () => {
    const error = salesforceTaggedError('Something went wrong')

    expect(error).not.toHaveProperty('operation')
  })
})

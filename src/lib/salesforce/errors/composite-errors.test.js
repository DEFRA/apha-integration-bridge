import { describe, expect, test } from '@jest/globals'
import {
  CompositeError,
  CompositeOperationError,
  CompositeObjectOperationError
} from './composite-errors.js'

describe('Salesforce composite errors', () => {
  test('creates a CompositeError with its message and failed items', () => {
    const failedItems = [{ referenceId: 'failedOperation' }]

    const error = new CompositeError('Composite request failed', failedItems)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(CompositeError)
    expect(error.name).toBe('CompositeError')
    expect(error.message).toBe('Composite request failed')
    expect(error.failedItems).toBe(failedItems)
  })

  test('creates a CompositeOperationError with the standard composite details', () => {
    const failedItems = [
      {
        body: [{ errorCode: 'INVALID_FIELD', message: 'Invalid field' }],
        httpHeaders: {},
        httpStatusCode: 400,
        referenceId: 'failedOperation'
      }
    ]

    const error = new CompositeOperationError(failedItems)

    expect(error).toBeInstanceOf(CompositeError)
    expect(error).toBeInstanceOf(CompositeOperationError)
    expect(error).not.toBeInstanceOf(CompositeObjectOperationError)
    expect(error.name).toBe('CompositeOperationError')
    expect(error.message).toBe('One or more composite operations failed')
    expect(error.failedItems).toBe(failedItems)
  })

  test('creates a CompositeObjectOperationError with object operation details', () => {
    const failedItems = [
      {
        id: 'failed-record',
        success: false,
        errors: [
          { errorCode: 'REQUIRED_FIELD_MISSING', message: 'Missing key' }
        ]
      }
    ]

    const error = new CompositeObjectOperationError(failedItems)

    expect(error).toBeInstanceOf(CompositeError)
    expect(error).toBeInstanceOf(CompositeObjectOperationError)
    expect(error).not.toBeInstanceOf(CompositeOperationError)
    expect(error.name).toBe('CompositeObjectOperationError')
    expect(error.message).toBe('One or more composite object operations failed')
    expect(error.failedItems).toBe(failedItems)
  })
})

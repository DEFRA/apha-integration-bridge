import { describe, expect, it } from '@jest/globals'
import { ServiceBusError } from '@azure/service-bus'

import {
  classifyError,
  SalesforceDisabledError,
  SalesforceForwardError,
  ValidationError
} from './errors.js'
import { MappingError } from '../salesforce/mappers/customer-registration.js'

describe('service-bus errors', () => {
  it('classifies validation errors as non-retryable', () => {
    expect(classifyError(new ValidationError('bad'))).toEqual({
      retryable: false,
      reason: 'validation_failed'
    })
  })

  it('classifies mapping errors as non-retryable', () => {
    expect(classifyError(new MappingError('bad map'))).toEqual({
      retryable: false,
      reason: 'mapping_failed'
    })
  })

  it('classifies disabled salesforce as non-retryable', () => {
    expect(classifyError(new SalesforceDisabledError('off'))).toEqual({
      retryable: false,
      reason: 'salesforce_disabled'
    })
  })

  it('classifies service bus errors and keeps retryable flag', () => {
    const error = new ServiceBusError('oops', 'GeneralError', false)

    expect(classifyError(error)).toEqual({
      retryable: Boolean(error.retryable ?? error.transient ?? true),
      reason: 'servicebus_GeneralError'
    })
  })

  it('classifies abort errors as retryable timeouts', () => {
    const abortError = new Error('timeout')
    abortError.name = 'AbortError'

    expect(classifyError(abortError)).toEqual({
      retryable: true,
      reason: 'timeout'
    })
  })

  it('classifies salesforce forwarding errors as retryable', () => {
    expect(classifyError(new SalesforceForwardError('sf fail'))).toEqual({
      retryable: true,
      reason: 'salesforce_error'
    })
  })

  it('defaults unknown errors to retryable', () => {
    expect(classifyError(new Error('weird'))).toEqual({
      retryable: true,
      reason: 'unknown_error'
    })
  })
})

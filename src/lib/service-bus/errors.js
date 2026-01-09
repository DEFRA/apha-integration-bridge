import { ServiceBusError } from '@azure/service-bus'

import { MappingError } from '../salesforce/mappers/customer-registration.js'

/**
 * @typedef {{ retryable: boolean, reason: string }} ErrorClassification
 */

/**
 * Validation error during message parsing or schema validation.
 */
class ValidationError extends Error {}

/**
 * Raised when Salesforce is disabled in configuration.
 */
class SalesforceDisabledError extends Error {}

/**
 * Raised when forwarding to Salesforce fails after validation/mapping.
 */
class SalesforceForwardError extends Error {}

/**
 * Normalise unknown errors into a retryable flag and reason code.
 *
 * @param {unknown} error
 * @returns {ErrorClassification}
 */
function classifyError(error) {
  if (error instanceof ValidationError) {
    return { retryable: false, reason: 'validation_failed' }
  }

  if (error instanceof MappingError) {
    return { retryable: false, reason: 'mapping_failed' }
  }

  if (error instanceof SalesforceDisabledError) {
    return { retryable: false, reason: 'salesforce_disabled' }
  }

  if (error instanceof ServiceBusError) {
    return {
      retryable: Boolean(error.retryable ?? error.transient ?? true),
      reason: `servicebus_${error.code || 'error'}`
    }
  }

  if (error?.name === 'AbortError') {
    return { retryable: true, reason: 'timeout' }
  }

  if (error instanceof SalesforceForwardError) {
    return { retryable: true, reason: 'salesforce_error' }
  }

  return { retryable: true, reason: 'unknown_error' }
}

export {
  classifyError,
  SalesforceDisabledError,
  SalesforceForwardError,
  ValidationError
}

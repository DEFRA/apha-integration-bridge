/** @import {SalesforceOperationError} from '../../../types/salesforce/operation-error.js' */

/**
 * Build an error tagged with the Salesforce operation that was being attempted.
 *
 * @param {string} message
 * @param {string} [operation]
 * @returns {SalesforceOperationError}
 */
export function salesforceTaggedError(message, operation) {
  const error = /** @type {SalesforceOperationError} */ (new Error(message))
  if (operation) {
    error.operation = operation
  }
  return error
}

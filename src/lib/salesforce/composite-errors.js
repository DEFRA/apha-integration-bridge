/**
 * @import {CompositeResponseItem} from '../../types/salesforce/composite-response.js'
 * @import {CompositeObjectResponseItem} from '../../types/salesforce/composite-response.js'
 */

/**
 * The Salesforce operation (for example, `addKeyFacts`) that was running when the error occurred, 
 * so callers know which step failed.
 * @typedef {Error & {operation?: string}} SalesforceOperationError
 */

export class CompositeError extends Error {
  /** @type {string|undefined} */
  operation

  /**
   * @param {string} message
   * @param {Object[]} failedItems
   * @param {string} [operation]
   */
  constructor(message, failedItems, operation) {
    super(message)
    this.name = 'CompositeError'
    this.failedItems = failedItems
    this.operation = operation
  }
}

/**
 * @property {CompositeResponseItem[]} failedItems
 */
export class CompositeOperationError extends CompositeError {
  /**
   * @param {CompositeResponseItem[]} failedItems
   * @param {string} [operation]
   */
  constructor(failedItems, operation) {
    super('One or more composite operations failed', failedItems, operation)
    this.name = 'CompositeOperationError'
  }
}

/**
 * @property {CompositeObjectResponseItem[]} failedItems
 */
export class CompositeObjectOperationError extends CompositeError {
  /**
   * @param {CompositeObjectResponseItem[]} failedItems
   * @param {string} [operation]
   */
  constructor(failedItems, operation) {
    super(
      'One or more composite object operations failed',
      failedItems,
      operation
    )
    this.name = 'CompositeObjectOperationError'
  }
}

/**
 * @import {CompositeResponseItem} from '../../types/salesforce/composite-response.js'
 * @import {CompositeObjectResponseItem} from '../../types/salesforce/composite-response.js'
 */

export class CompositeError extends Error {
  /**
   * @param {string} message
   * @param {Object[]} failedItems
   */
  constructor(message, failedItems) {
    super(message)
    this.name = 'CompositeError'
    this.failedItems = failedItems
  }
}

export class CompositeOperationError extends CompositeError {
  /**
   * @param {CompositeResponseItem[]} failedItems
   */
  constructor(failedItems) {
    super('One or more composite operations failed', failedItems)
    this.name = 'CompositeOperationError'
  }
}

export class CompositeObjectOperationError extends CompositeError {
  /**
   * @param {CompositeObjectResponseItem[]} failedItems
   */
  constructor(failedItems) {
    super('One or more composite object operations failed', failedItems)
    this.name = 'CompositeObjectOperationError'
  }
}

/**
 * @typedef {Object} SalesforceError
 * @property {string} errorCode - Salesforce error code
 * @property {string} message - Error message
 */

/**
 * @typedef {Object} CompositeResponseItem
 * @property {SalesforceError[] | Object} body - Response body, either array of errors or success response
 * @property {Object} httpHeaders - HTTP headers from the response
 * @property {number} httpStatusCode - HTTP status code
 * @property {string} referenceId - Reference ID matching the original request
 */

/**
 * @typedef {Object} CompositeResponse
 * @property {CompositeResponseItem[]} compositeResponse - Array of composite response items
 */

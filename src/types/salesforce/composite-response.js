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
 * @typedef {CompositeResponseItem[]} CompositeResponse
 */

/**
 * @typedef {Object} CompositeObjectResponseItem
 * @property {string} id - Salesforce record ID.
 * @property {boolean} success - Whether the record operation succeeded.
 * @property {SalesforceError[]} errors - Errors returned for the record operation.
 */

/**
 * @typedef {CompositeObjectResponseItem[]} CompositeObjectResponse
 */

/**
 * @typedef {Object} CompositeGraphResult
 * @property {string} graphId - Identifier of the graph within the request
 * @property {boolean} isSuccessful - Whether all requests within the graph succeeded
 * @property {{compositeResponse: CompositeResponseItem[]}} graphResponse - Composite responses for the graph's sub-requests
 */

/**
 * @typedef {CompositeGraphResult[]} CompositeGraphResponse
 */

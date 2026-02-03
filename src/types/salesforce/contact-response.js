/**
 * @typedef {Object} SalesforceError
 * @property {string} errorCode - Salesforce error code
 * @property {string} message - Error message
 */

/**
 * @typedef {Object} CreateGuestResponse
 * @property {SalesforceError[]} errors - Array of Salesforce errors
 * @property {boolean} success - Indicates if the request was successful
 * @property {string} id - ID of the created contact
 */

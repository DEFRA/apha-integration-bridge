/**
 * @typedef {Object} SalesforceObjectAttributes
 * @property {string} type
 * @property {string} url
 */

/**
 * @typedef {Object} SalesforceContentDocument
 * @property {SalesforceObjectAttributes} attributes
 * @property {string} Title
 * @property {{
 *   attributes: SalesforceObjectAttributes,
 *   PathOnClient: string
 * }} LatestPublishedVersion
 */

/**
 * @typedef {Object} SalesforceContentDocumentLink
 * @property {SalesforceObjectAttributes} attributes
 * @property {string} ContentDocumentId
 * @property {SalesforceContentDocument} ContentDocument
 */

/**
 * @typedef {Object} SalesforceLinkedFileSummary
 * @property {string} title
 * @property {string} pathOnClient
 */

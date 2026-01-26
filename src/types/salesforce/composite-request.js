import Joi from 'joi'

/**
 * @typedef {Object} CompositeRequestItem
 * @property {string} method - HTTP method for the composite request
 * @property {string} url - Salesforce API endpoint URL
 * @property {string} referenceId - Reference ID to identify this sub-request
 * @property {Object} [body] - Request body for POST/PATCH/PUT requests
 */

const CompositeRequestItemSchema = Joi.object({
  method: Joi.string()
    .valid('GET', 'POST', 'PATCH', 'PUT', 'DELETE')
    .required()
    .description('HTTP method for the composite request'),
  url: Joi.string().required().description('Salesforce API endpoint URL'),
  referenceId: Joi.string()
    .required()
    .description('Reference ID to identify this sub-request'),
  body: Joi.object()
    .unknown(true)
    .optional()
    .description('Request body for POST/PATCH/PUT requests')
})
  .description('Individual composite request item')
  .label('Composite Request Item')

/**
 * @typedef {Object} CompositeRequest
 * @property {boolean} [allOrNone=true] - Indicates whether to roll back the entire composite request if one sub-request fails
 * @property {CompositeRequestItem[]} compositeRequest - Array of composite request items
 */

export const CompositeRequestSchema = Joi.object({
  allOrNone: Joi.boolean()
    .default(true)
    .description(
      'Indicates whether to roll back the entire composite request if one sub-request fails'
    ),
  compositeRequest: Joi.array()
    .items(CompositeRequestItemSchema)
    .required()
    .description('Array of composite request items')
})
  .description('Salesforce Composite Request Payload')
  .label('Composite Request Payload')

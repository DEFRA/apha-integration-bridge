import { SalesforceForwardError } from './errors.js'
import { salesforceForwarded } from './metrics.js'

/**
 * Send the composite request to Salesforce and emit SF-specific metrics.
 *
 * @param {object} options
 * @param {object} options.compositeRequest
 * @param {{ info: Function, error: Function, warn: Function, trace: Function }} options.logger
 * @param {string} options.entityPath
 * @param {{ sendComposite: Function }} options.salesforceClient
 */
async function forwardToSalesforce({
  compositeRequest,
  logger,
  entityPath,
  salesforceClient
}) {
  try {
    const response = await salesforceClient.sendComposite(
      compositeRequest,
      logger
    )

    salesforceForwarded.add(1, {
      outcome: 'success',
      entityPath
    })

    return response
  } catch (error) {
    salesforceForwarded.add(1, {
      outcome: 'failure',
      entityPath,
      reason: 'salesforce_error'
    })

    // Preserve retryability: SF transient errors should go back to queue unless max deliveries reached
    throw new SalesforceForwardError('Failed to forward event to Salesforce', {
      cause: error
    })
  }
}

export { forwardToSalesforce }

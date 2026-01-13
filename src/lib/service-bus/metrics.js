import { meter } from '../telemetry/index.js'

/**
 * Counter for Service Bus message handling outcomes.
 *
 * @type {import('@opentelemetry/api').Counter}
 */
export const messageProcessed = meter.createCounter(
  'servicebus.message.processed',
  {
    description: 'Service Bus message processing outcome',
    unit: 'Count'
  }
)

/**
 * Counter for Salesforce forwarding results.
 *
 * @type {import('@opentelemetry/api').Counter}
 */
export const salesforceForwarded = meter.createCounter(
  'servicebus.salesforce.forward',
  {
    description: 'Result of forwarding Service Bus events to Salesforce',
    unit: 'Count'
  }
)

/**
 * Lightweight shape hints for tooling (kept loose to avoid IDE/type churn).
 *
 * @typedef {{
 *   body: unknown,
 *   messageId?: string | number | unknown,
 *   deliveryCount?: number
 * }} ServiceBusMessageLike
 * @typedef {{ completeMessage: Function, abandonMessage: Function, deadLetterMessage: Function }} ServiceBusReceiverLike
 * @typedef {{ info: Function, debug: Function, error: Function, warn: Function, trace: Function }} LoggerLike
 * @typedef {{ sendComposite: Function, cfg: { enabled: boolean } }} SalesforceClientLike
 */
import { buildCustomerRegistrationComposite } from '../salesforce/mappers/customer-registration.js'
import { classifyError, SalesforceDisabledError } from './errors.js'
import { messageProcessed } from './metrics.js'
import { forwardToSalesforce } from './salesforce.js'
import { parseMessageBody, validateCustomerEvent } from './utils.js'

/**
 * Handle a received Service Bus message lifecycle: parse, validate, forward, settle, and emit metrics.
 *
 * @param {{ message: ServiceBusMessageLike, receiver: ServiceBusReceiverLike, logger: LoggerLike, entityPath: string, maxDeliveryCount: number, salesforceClient: SalesforceClientLike }} options
 */
async function processMessage({
  message,
  receiver,
  logger,
  entityPath,
  maxDeliveryCount,
  salesforceClient
}) {
  const attempts = (message.deliveryCount ?? 0) + 1
  logger.debug(
    {
      messageId: message.messageId,
      deliveryCount: attempts,
      entityPath
    },
    'Processing Service Bus message'
  )

  try {
    const payload = parseMessageBody(message)
    const event = validateCustomerEvent(payload)

    const compositeRequest = buildCustomerRegistrationComposite(event)

    if (!salesforceClient.cfg.enabled) {
      // Bail out early; treating disabled SF as non-retryable avoids burning queue retries
      throw new SalesforceDisabledError('Salesforce integration disabled')
    }

    const salesforceResponse = await forwardToSalesforce({
      compositeRequest,
      logger,
      entityPath,
      salesforceClient
    })

    await receiver.completeMessage(message)

    messageProcessed.add(1, {
      outcome: 'success',
      entityPath
    })

    logger.info(
      {
        messageId: message.messageId,
        deliveryCount: attempts
      },
      'Service Bus message processed and forwarded to Salesforce'
    )

    return salesforceResponse
  } catch (error) {
    const { retryable, reason } = classifyError(error)

    const shouldDeadLetter =
      !retryable || attempts >= (maxDeliveryCount ?? Number.MAX_SAFE_INTEGER)

    try {
      if (shouldDeadLetter) {
        await receiver.deadLetterMessage(message, {
          deadLetterReason: reason,
          deadLetterErrorDescription: error?.message || String(error)
        })
      } else {
        // Retry path keeps original message so we don't lose payload context
        await receiver.abandonMessage(message)
      }
    } catch (settlementError) {
      logger.error(
        {
          err: settlementError,
          messageId: message.messageId
        },
        'Failed to settle Service Bus message'
      )
    }

    messageProcessed.add(1, {
      outcome: 'failure',
      entityPath,
      reason
    })

    logger.error(
      {
        err: error,
        messageId: message.messageId,
        deliveryCount: attempts,
        deadLettered: shouldDeadLetter,
        reason
      },
      'Failed to process Service Bus message'
    )

    logger.debug(
      {
        messageId: message.messageId,
        outcome: shouldDeadLetter ? 'dead-letter' : 'abandon',
        reason
      },
      'Service Bus message settlement decision'
    )
  }
}

export { processMessage }

/**
 * Lightweight shape hints for tooling (kept loose to avoid IDE/type churn).
 *
 * @typedef {{ info: Function, debug: Function, error: Function, warn: Function, trace: Function }} LoggerLike
 * @typedef {{ error: unknown }} ProcessErrorArgs
 */
import { classifyError } from './errors.js'
import { messageProcessed } from './metrics.js'

/**
 * Handle processor errors surfaced by the SDK.
 *
 * @param {ProcessErrorArgs & { logger: LoggerLike, entityPath: string }} args
 */
async function processError({ error, logger, entityPath }) {
  const classification = classifyError(error)

  messageProcessed.add(1, {
    outcome: 'failure',
    entityPath,
    reason: classification.reason
  })

  logger.error(
    {
      err: error,
      entityPath
    },
    'Service Bus processor error'
  )

  logger.debug(
    {
      entityPath,
      reason: classification.reason
    },
    'Service Bus processor error classification'
  )
}

export { processError }

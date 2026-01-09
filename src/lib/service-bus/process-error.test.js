import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { ServiceBusError } from '@azure/service-bus'

import { messageProcessed } from './metrics.js'
import { processError } from './process-error.js'

describe('processError', () => {
  /** @type {import('pino').Logger} */
  let logger

  beforeEach(() => {
    logger = createLoggerMock()
    jest.spyOn(messageProcessed, 'add').mockImplementation(() => {})
  })

  it('logs failure metric', async () => {
    const sbError = new ServiceBusError('boom', 'MessagingEntityNotFound')

    await processError({
      error: sbError,
      logger,
      entityPath: 'queue'
    })

    expect(messageProcessed.add).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        outcome: 'failure',
        reason: 'servicebus_MessagingEntityNotFound'
      })
    )
  })
})

function createLoggerMock() {
  return {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn()
  }
}

import { jest, test, expect } from '@jest/globals'

import { createLogger } from './logging/logger.js'
import { failAction } from './fail-action.js'

jest.mock('./logging/logger.js', () => {
  const warnMock = jest.fn()

  return {
    createLogger: jest.fn(() => ({
      warn: warnMock
    }))
  }
})

test('should throw and log expected error', () => {
  /** @type {any} */
  const mockRequest = {}

  /** @type {any} */
  const mockToolkit = {}

  const mockError = Error('Something terrible has happened!')

  expect(() => failAction(mockRequest, mockToolkit, mockError)).toThrow(
    'Something terrible has happened!'
  )

  expect(createLogger().warn).toHaveBeenCalledTimes(1)
})

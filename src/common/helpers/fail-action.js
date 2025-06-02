import { createLogger } from './logging/logger.js'

const logger = createLogger()

/**
 * handles logging and error handling for Hapi.js routes.
 *
 * @typedef {import('@hapi/hapi').Lifecycle.FailAction} FailAction
 *
 * @param {import('@hapi/hapi').Request} _request
 * @param {import('@hapi/hapi').ResponseToolkit} _h
 * @param {Error} error
 *
 * @returns {never} Throws the error to be handled by Hapi.js}
 */
export function failAction(_request, _h, error) {
  logger.warn(error, error?.message)

  throw error
}

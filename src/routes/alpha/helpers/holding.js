import Joi from 'joi'

import { HTTPException } from '../../../lib/http/http-exception.js'

export const HoldingParamsSchema = Joi.object({
  countyId: Joi.string()
    .length(2)
    .regex(/^\d+$/)
    .required()
    .description('County ID'),
  parishId: Joi.string()
    .length(3)
    .regex(/^\d+$/)
    .required()
    .description('Parish ID'),
  holdingId: Joi.string()
    .length(4)
    .regex(/^\d+$/)
    .required()
    .description('Holding ID')
}).required()

/**
 * @param {Record<string, object[]>} mockData the response data for each mock CPH
 * @returns {import('@hapi/hapi').Lifecycle.Method}
 */
export const mockHoldingHandler = (mockData) => async (request, h) => {
  const { countyId, parishId, holdingId } = request.params

  const data = mockData[`${countyId}/${parishId}/${holdingId}`]

  if (!data) {
    return new HTTPException(
      'NOT_FOUND',
      'Holding not found or inactive'
    ).boomify()
  }

  return h.response({ data, links: { self: request.path } }).code(200)
}

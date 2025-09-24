import Joi from 'joi'
import { query } from '../operations/query.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

/**
 * @typedef {import('joi')} Joi
 */

export const FindHoldingSchema = Joi.object({
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
})

/**
 * @typedef {Record<string, Array<(value: unknown) => unknown>>} Marshallers
 * @typedef {{ sql: string; bindings: readonly unknown[]; marshallers?: Marshallers }} Query
 *
 * @param {unknown} parameters
 * @returns {{ sql: string; }} The query and its bindings
 */
export function findHoldingQuery(parameters) {
  const { value, error } = FindHoldingSchema.validate(parameters)

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const cph = `${value.countyId}/${value.parishId}/${value.holdingId}`

  return {
    sql: query().raw(sql, { cph }).toString()
  }
}

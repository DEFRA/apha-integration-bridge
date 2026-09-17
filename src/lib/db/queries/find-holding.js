import Joi from 'joi'
import { loadSQL } from '../utils/load-sql.js'
import { HoldingIdSchema } from '../../../types/holdings.js'

const sql = loadSQL(import.meta.filename)

/**
 * @typedef {import('joi')} Joi
 */

export const FindHoldingSchema = Joi.object({
  cph: HoldingIdSchema
})

/**
 * @param {unknown} parameters
 * @returns {{ sql: string; bindings: Record<string, unknown> }} The query and its bindings
 */
export function findHoldingQuery(parameters) {
  const { value, error } = FindHoldingSchema.validate(parameters)

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  return {
    sql,
    bindings: { cph: value.cph }
  }
}

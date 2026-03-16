import Joi from 'joi'
import { query } from '../operations/query.js'
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

  return {
    sql: query().raw(sql, value).toQuery()
  }
}

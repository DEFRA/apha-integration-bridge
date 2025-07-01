import Joi from 'joi'

import { query } from '../operations/query.js'

/**
 * @typedef {import('joi')} Joi
 */

/**
 * Schema for validating parameters to lookup holdings from the database
 *
 * @typedef {Object} FindHoldingSchema
 * @property {string} countyId - The ID of the county
 * @property {string} parishId - The ID of the parish
 * @property {string} holdingsId - The ID of the holdings
 */
export const FindHoldingSchema = Joi.object({
  countyId: Joi.string().regex(/^\d+$/).required().description('County ID'),
  parishId: Joi.string().regex(/^\d+$/).required().description('Parish ID'),
  holdingsId: Joi.string().regex(/^\d+$/).required().description('Holdings ID')
})

/**
 * @typedef {Record<string, Array<(value: unknown) => unknown>>} Marshallers
 * @typedef {{ sql: string; bindings: readonly unknown[]; marshallers?: Marshallers }} Query
 *
 * @param {unknown} parameters Parameters required to build the query for looking up a holding
 * @returns {Query} the query builder for looking up a holding
 */
export function findHoldingQuery(parameters) {
  /**
   * validate parameters first
   */
  const { value, error } = FindHoldingSchema.validate(parameters)

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const cph = `${value.countyId}/${value.parishId}/${value.holdingsId}`

  const { sql, bindings } = query()
    .select('cph')
    .select('cph_type as cphtype')
    .distinct()
    .from('ahbrp.cph')
    .where('cph', `LIKE`, cph)
    .toSQL()

  return {
    sql,
    bindings
  }
}

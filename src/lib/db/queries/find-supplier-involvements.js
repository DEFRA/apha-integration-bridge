import Joi from 'joi'

import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

const FEATURE_KEYS_BIND_TOKEN = '__FEATURE_KEYS__'

const FindSupplierInvolvementsSchema = Joi.object({
  featureKeys: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .description('SAM feature keys of the holdership locations')
})

/**
 * One row per current OVFOR or DPFOR involvement with a livestock unit whose
 * current primary location is one of the features: the Official Veterinarian
 * practice or the Delivery Partner for the unit, with the supplier's party
 * type, names and the role behind the involvement. SAM gives OVFOR only to
 * OVPRACTICE parties and DPFOR only to DELIVERYPARTNER parties.
 *
 * @param {Array<number>} featureKeys
 * @returns {{ sql: string; bindings: Record<string, unknown> }} The query and its bindings
 */
export function findSupplierInvolvementsQuery(featureKeys) {
  const { value, error } = FindSupplierInvolvementsSchema.validate({
    featureKeys
  })

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const { placeholders, bindings } = createInClauseBindings(value.featureKeys)
  const sqlWithFeatureKeys = sql.replace(FEATURE_KEYS_BIND_TOKEN, placeholders)

  return {
    sql: sqlWithFeatureKeys,
    bindings
  }
}

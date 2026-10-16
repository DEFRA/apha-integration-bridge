import Joi from 'joi'

import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

const FEATURE_KEYS_BIND_TOKEN = '__FEATURE_KEYS__'

const FindPartyInvolvementsSchema = Joi.object({
  featureKeys: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .description('SAM feature keys of the holdership locations')
})

/**
 * One row per (party, involvement) at each location: the CPH holder, the
 * owner of place, and the keepers and owners of the livestock units whose
 * current primary location it is, each with the party's type and status and
 * the role behind the involvement.
 *
 * @param {Array<number>} featureKeys
 * @returns {{ sql: string; bindings: Record<string, unknown> }} The query and its bindings
 */
export function findPartyInvolvementsQuery(featureKeys) {
  const { value, error } = FindPartyInvolvementsSchema.validate({ featureKeys })

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

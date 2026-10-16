import Joi from 'joi'

import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

const FEATURE_KEYS_BIND_TOKEN = '__FEATURE_KEYS__'

const FindSubLocationsSchema = Joi.object({
  featureKeys: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .description('SAM feature keys of the premises')
})

/**
 * The current sub-locations (sheds, fields) that each premises contains,
 * through FEATURE_RELATIONSHIP rows of type CONTAINS with the premises as the
 * first feature.
 *
 * @param {Array<number>} featureKeys
 * @returns {{ sql: string; bindings: Record<string, unknown> }} The query and its bindings
 */
export function findSubLocationsQuery(featureKeys) {
  const { value, error } = FindSubLocationsSchema.validate({ featureKeys })

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

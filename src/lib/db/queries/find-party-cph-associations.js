import Joi from 'joi'

import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

const PARTY_KEYS_BIND_TOKEN = '__PARTY_KEYS__'

const FindPartyCphAssociationsSchema = Joi.object({
  partyKeys: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .description('SAM party keys')
})

/**
 * One row per (party, CPH, role, involvement type, location, livestock unit)
 * for each party's current involvements: the CPH holderships it holds, the
 * locations it owns and the livestock units it keeps or owns. An owner's or
 * keeper's CPH is that of the active holdership at the location, so an
 * involvement at a location with no active holdership has no row.
 *
 * @param {Array<number>} partyKeys
 * @returns {{ sql: string; bindings: Record<string, unknown> }} The query and its bindings
 */
export function findPartyCphAssociationsQuery(partyKeys) {
  const { value, error } = FindPartyCphAssociationsSchema.validate({
    partyKeys
  })

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const { placeholders, bindings } = createInClauseBindings(value.partyKeys)
  const sqlWithPartyKeys = sql.replace(PARTY_KEYS_BIND_TOKEN, placeholders)

  return {
    sql: sqlWithPartyKeys,
    bindings
  }
}

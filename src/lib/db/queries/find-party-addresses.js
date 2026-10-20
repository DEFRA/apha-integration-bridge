import Joi from 'joi'

import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

const PARTY_KEYS_BIND_TOKEN = '__PARTY_KEYS__'

const FindPartyAddressesSchema = Joi.object({
  partyKeys: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .description('SAM party keys')
})

/**
 * Every current postal address of each party: one row per address link,
 * where both the link and its address have started and not ended, with the
 * BS7666 fields, the county decoded through the COUNTY reference set, and
 * the link's current usage, the preferred one when it has several. SAM holds
 * every postal link at party level, never through a role.
 *
 * @param {Array<number>} partyKeys
 * @returns {{ sql: string; bindings: Record<string, unknown> }} The query and its bindings
 */
export function findPartyAddressesQuery(partyKeys) {
  const { value, error } = FindPartyAddressesSchema.validate({ partyKeys })

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

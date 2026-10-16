import Joi from 'joi'

import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

const PARTY_KEYS_BIND_TOKEN = '__PARTY_KEYS__'

const FindPartyContactsSchema = Joi.object({
  partyKeys: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .description('SAM party keys')
})

/**
 * Every current e-mail, phone and fax contact of each party, held directly or
 * through one of its current roles: one row per contact, with the value for
 * its type, its usage type and SAM's preferred-contact indicator.
 *
 * @param {Array<number>} partyKeys
 * @returns {{ sql: string; bindings: Record<string, unknown> }} The query and its bindings
 */
export function findPartyContactsQuery(partyKeys) {
  const { value, error } = FindPartyContactsSchema.validate({ partyKeys })

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

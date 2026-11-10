import Joi from 'joi'

import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

const PARTY_KEYS_BIND_TOKEN = '__PARTY_KEYS__'

const FindPartyOrganisationsSchema = Joi.object({
  partyKeys: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .description('SAM party keys')
})

/**
 * The organisations each party is currently related to through
 * PARTY_RELATIONSHIP, where the party is the first party and the organisation
 * is not inactive. An organisation related more than once is listed once.
 *
 * @param {Array<number>} partyKeys
 * @returns {{ sql: string; bindings: Record<string, unknown> }} The query and its bindings
 */
export function findPartyOrganisationsQuery(partyKeys) {
  const { value, error } = FindPartyOrganisationsSchema.validate({ partyKeys })

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

import Joi from 'joi'

import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

const PARTY_KEYS_BIND_TOKEN = '__PARTY_KEYS__'

const FindOrganisationAttributesSchema = Joi.object({
  partyKeys: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .description('SAM party keys')
})

/**
 * The name and type of each party whose current version is an organisation.
 * SAM types nearly every organisation NOTKNOWN and marks its own
 * organisational units AHORGUNIT; those are returned like any other, as the
 * organisations endpoint returns them today. An organisation's roles and
 * contacts come from the party-role and party-contact queries.
 *
 * @param {Array<number>} partyKeys
 * @returns {{ sql: string; bindings: Record<string, unknown> }} The query and its bindings
 */
export function findOrganisationAttributesQuery(partyKeys) {
  const { value, error } = FindOrganisationAttributesSchema.validate({
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

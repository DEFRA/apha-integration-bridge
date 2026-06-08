import Joi from 'joi'

import { toHoldings } from '../mappers/to-holdings.js'
import { execute } from '../operations/execute.js'
import { query } from '../operations/query.js'
import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { loadSQL } from '../utils/load-sql.js'
import { HoldingIdSchema } from '../../../types/holdings.js'

const sql = loadSQL(import.meta.filename)

const CPH_IDS_BIND_TOKEN = '__CPH_IDS__'

const FindHoldingsSchema = Joi.object({
  ids: Joi.array()
    .items(HoldingIdSchema)
    .min(1)
    .required()
    .description('List of CPHs')
})

/**
 * @param {Array<string>} ids
 * @returns {{ sql: string; }} The query and its bindings
 */
export function findHoldingsQuery(ids) {
  const { value, error } = FindHoldingsSchema.validate({ ids })

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const { placeholders, bindings } = createInClauseBindings(value.ids)
  const sqlWithIds = sql.replace(CPH_IDS_BIND_TOKEN, placeholders)

  return {
    sql: query()
      .raw(sqlWithIds, { ...bindings })
      .toQuery()
  }
}

/**
 * Executes the find holdings query and maps database rows to API holding objects.
 *
 * @param {import('oracledb').Connection} connection
 * @param {string[]} ids
 */
export async function findHoldings(connection, ids) {
  const query = findHoldingsQuery(ids)

  const rows = await execute(connection, query)

  return toHoldings(rows, ids)
}

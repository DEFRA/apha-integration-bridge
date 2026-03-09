import Joi from 'joi'

import { toHoldings } from '../mappers/to-holdings.js'
import { execute } from '../operations/execute.js'
import { loadSQL } from '../utils/load-sql.js'
import { HoldingIdSchema } from '../../../types/holdings.js'

const sql = loadSQL(import.meta.filename)

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

  const quotedCphIds = value.ids.map((cphId) => `'${cphId}'`)
  const query = sql.replace(':cphIds', quotedCphIds.join(', '))

  return {
    sql: query
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

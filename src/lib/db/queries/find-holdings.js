import { toHoldings } from '../mappers/to-holdings.js'
import { execute } from '../operations/execute.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

/**
 * @param {Array<string>} ids
 * @returns {{ sql: string; }} The query and its bindings
 */
export function findHoldingsQuery(ids) {
  const quotedCphIds = ids.map((cphId) => `'${cphId}'`)
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

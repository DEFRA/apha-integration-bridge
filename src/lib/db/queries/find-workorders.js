import { toWorkorders } from '../mappers/to-workorders.js'
import { execute } from '../operations/execute.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

/**
 * @param {Array<string>} ids
 * @returns {{ sql: string; }} The query and its bindings
 */
export function findWorkordersQuery(ids) {
  const quotedWorkorderIds = ids.map((workorderId) => `'${workorderId}'`)
  const query = sql.replace(':workorder_ids', quotedWorkorderIds.join(', '))

  return {
    sql: query
  }
}

/**
 * Executes the find workorders query and maps database rows to API workorder objects.
 *
 * @param {import('oracledb').Connection} connection
 * @param {string[]} ids
 */
export async function findWorkorders(connection, ids) {
  const query = findWorkordersQuery(ids)

  const rows = await execute(connection, query)

  return toWorkorders(rows, ids)
}

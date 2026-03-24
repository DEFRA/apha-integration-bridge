import { execute } from '../operations/execute.js'
import { query } from '../operations/query.js'
import { loadSQL } from '../utils/load-sql.js'
import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'

const sql = loadSQL(import.meta.filename)

const WORKAREA_CODES_BIND_TOKEN = '__WORKAREA_CODES__'

/**
 * @param {string[]} workAreaCodes
 * @returns {{ sql: string }}
 */
export function getWorkAreaCodeMappingQuery(workAreaCodes) {
  const { placeholders, bindings } = createInClauseBindings(workAreaCodes)
  const sqlWithCodes = sql.replace(WORKAREA_CODES_BIND_TOKEN, placeholders)
  return {
    sql: query()
      .raw(sqlWithCodes, { ...bindings })
      .toQuery()
  }
}

/**
 * @param {import('oracledb').Connection} connection
 * @param {string[]} workAreaCodes
 */
export async function getWorkAreaCodeMapping(connection, workAreaCodes) {
  const queryToRun = getWorkAreaCodeMappingQuery(workAreaCodes)

  const rows = await execute(connection, queryToRun)

  return rows
}

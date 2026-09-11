import { execute } from '../operations/execute.js'
import { loadSQL } from '../utils/load-sql.js'
import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { GetCodeMappingSchema } from '../../../types/find/workorders.js'

const sql = loadSQL(import.meta.filename)

const WORKAREA_CODES_BIND_TOKEN = '__WORKAREA_CODES__'

/**
 * @param {string[]} workAreaCodes
 * @returns {{ sql: string; bindings: Record<string, unknown> }}
 */
export function getWorkAreaCodeMappingQuery(workAreaCodes) {
  const { error } = GetCodeMappingSchema.validate(workAreaCodes)

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const { placeholders, bindings } = createInClauseBindings(workAreaCodes)
  const sqlWithCodes = sql.replace(WORKAREA_CODES_BIND_TOKEN, placeholders)
  return {
    sql: sqlWithCodes,
    bindings
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

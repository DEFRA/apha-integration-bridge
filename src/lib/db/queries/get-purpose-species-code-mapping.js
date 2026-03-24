import { execute } from '../operations/execute.js'
import { query } from '../operations/query.js'
import { loadSQL } from '../utils/load-sql.js'
import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { GetCodeMappingSchema } from '../../../types/find/workorders.js'

const sql = loadSQL(import.meta.filename)

const SPECIES_CODES_BIND_TOKEN = '__PURPOSE_SPECIES_CODES__'

/**
 * @param {string[]} speciesCodes
 * @returns {{ sql: string }}
 */
export function getPurposeSpeciesCodeMappingQuery(speciesCodes) {
  const { error } = GetCodeMappingSchema.validate(speciesCodes)

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const { placeholders, bindings } = createInClauseBindings(speciesCodes)
  const sqlWithCodes = sql.replace(SPECIES_CODES_BIND_TOKEN, placeholders)
  return {
    sql: query()
      .raw(sqlWithCodes, { ...bindings })
      .toQuery()
  }
}

/**
 * @param {import('oracledb').Connection} connection
 * @param {string[]} speciesCodes
 */
export async function getPurposeSpeciesCodeMapping(connection, speciesCodes) {
  const queryToRun = getPurposeSpeciesCodeMappingQuery(speciesCodes)

  const rows = await execute(connection, queryToRun)

  return rows
}

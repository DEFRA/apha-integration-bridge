import { toLocations } from '../mappers/to-locations.js'
import { execute } from '../operations/execute.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

/**
 * @param {Array<string>} ids
 * @returns {{ sql: string; }} The query and its bindings
 */
export function findLocationsQuery(ids) {
  const quotedLocationIds = ids.map((locationId) => `'${locationId}'`)
  const query = sql.replaceAll(':locationIds', quotedLocationIds.join(', '))

  return {
    sql: query
  }
}

/**
 * Executes the find locations query and maps database rows to API location objects.
 *
 * @param {import('oracledb').Connection} connection
 * @param {string[]} ids
 */
export async function findLocations(connection, ids) {
  const query = findLocationsQuery(ids)

  const rows = await execute(connection, query)

  return toLocations(rows, ids)
}

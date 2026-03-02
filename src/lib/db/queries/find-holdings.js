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

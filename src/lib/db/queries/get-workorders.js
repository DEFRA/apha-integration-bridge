import { toWorkorders } from '../mappers/to-workorders.js'
import { execute } from '../operations/execute.js'
import { query } from '../operations/query.js'
import { loadSQL } from '../utils/load-sql.js'
import { toOracleTimestampString } from '../utils/to-oracle-timestamp-string.js'
import { GetWorkordersSchema } from '../../../types/find/workorders-get.js'

const sql = loadSQL(import.meta.filename)

/**
 * @typedef {{
 *   startActivationDate: string
 *   endActivationDate: string
 *   country?: string
 *   page?: number
 *   pageSize?: number
 * }} GetWorkordersParams
 */

/**
 * @param {GetWorkordersParams} params
 * @returns {{ sql: string }}
 */
export function getWorkordersQuery(params) {
  const { value, error } = GetWorkordersSchema.validate(params)

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const startActivationDate = new Date(value.startActivationDate)
  const endActivationDate = new Date(value.endActivationDate)

  if (endActivationDate <= startActivationDate) {
    throw new Error(
      'Invalid parameters: End activation date must be after start activation date'
    )
  }

  const offsetRows = (value.page - 1) * value.pageSize
  const fetchRows = value.pageSize + 1
  const normalizedCountry = value.country.trim().toUpperCase()

  return {
    sql: query()
      .raw(sql, {
        start_activation_date: toOracleTimestampString(startActivationDate),
        end_activation_date: toOracleTimestampString(endActivationDate),
        country: normalizedCountry,
        offset_rows: offsetRows,
        fetch_rows: fetchRows
      })
      .toQuery()
  }
}

/**
 * @param {import('oracledb').Connection} connection
 * @param {GetWorkordersParams} params
 */
export async function getWorkorders(connection, params) {
  const queryToRun = getWorkordersQuery(params)

  const rows = await execute(connection, queryToRun)

  const orderedDistinctIds = [
    ...new Set(
      rows
        .map((row) => row.work_order_id)
        .filter((workorderId) => typeof workorderId === 'string')
    )
  ]

  const hasMore = orderedDistinctIds.length > params.pageSize
  const pageIds = orderedDistinctIds.slice(0, params.pageSize)

  return {
    hasMore,
    workorders: toWorkorders(rows, pageIds)
  }
}

import { toWorkorders } from '../mappers/to-workorders.js'
import { execute } from '../operations/execute.js'
import { query } from '../operations/query.js'
import { loadSQL } from '../utils/load-sql.js'
import { PaginateWorkordersSchema } from '../../../types/find/workorders-pagination.js'

const sql = loadSQL(import.meta.filename)

/**
 * @typedef {{
 *   startActivationDate: string
 *   endActivationDate: string
 *   country?: string
 *   page: number
 *   pageSize: number
 * }} PaginateWorkordersParams
 */

/**
 * @param {PaginateWorkordersParams} params
 * @returns {{ sql: string }}
 */
export function paginateWorkordersQuery(params) {
  const { value, error } = PaginateWorkordersSchema.validate(params)

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
        start_activation_date: value.startActivationDate.slice(0, 10),
        end_activation_date: value.endActivationDate.slice(0, 10),
        country: normalizedCountry,
        offset_rows: offsetRows,
        fetch_rows: fetchRows
      })
      .toString()
  }
}

/**
 * @param {import('oracledb').Connection} connection
 * @param {PaginateWorkordersParams} params
 */
export async function paginateWorkorders(connection, params) {
  const queryToRun = paginateWorkordersQuery(params)

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

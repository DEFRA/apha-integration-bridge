import Joi from 'joi'

import { toWorkorders } from '../mappers/to-workorders.js'
import { execute } from '../operations/execute.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

const FindWorkordersSchema = Joi.object({
  ids: Joi.array()
    .items(
      Joi.string()
        .trim()
        .pattern(/^WS-[0-9]{5}$/i)
        .min(1)
        .required()
    )
    .min(1)
    .required()
    .description('Workorder ids')
})

/**
 * @param {Array<string>} ids
 * @returns {{ sql: string; }} The query and its bindings
 */
export function findWorkordersQuery(ids) {
  const { value, error } = FindWorkordersSchema.validate({ ids })

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const quotedWorkorderIds = value.ids.map((workorderId) => `'${workorderId}'`)
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

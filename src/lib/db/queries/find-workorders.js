import Joi from 'joi'

import { toWorkorders } from '../mappers/to-workorders.js'
import { execute } from '../operations/execute.js'
import { query } from '../operations/query.js'
import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { loadSQL } from '../utils/load-sql.js'
import { getWorkorderMappings, workordersSQL } from './workorders.js'
import { WorkorderIdSchema } from '../../../types/workorders.js'

/** @import { DBConnections } from '../../../types/connection.js' */

const sql = loadSQL(import.meta.filename) + workordersSQL

const WORKORDER_IDS_BIND_TOKEN = '__WORKORDER_IDS__'
const STATUSES_BIND_TOKEN = '__STATUSES__'

const FindWorkordersSchema = Joi.object({
  ids: Joi.array()
    .items(WorkorderIdSchema)

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

  const { placeholders, bindings } = createInClauseBindings(value.ids)

  // Finding by id does not filter on status, so the shared status clause is
  // switched off the same way GET switches off its country filter.
  const sqlWithIds = sql
    .replace(WORKORDER_IDS_BIND_TOKEN, placeholders)
    .replace(STATUSES_BIND_TOKEN, 'NULL')

  return {
    sql: query()
      .raw(sqlWithIds, { ...bindings, has_statuses: 0 })
      .toQuery()
  }
}

/**
 * Executes the find workorders query and maps database rows to API workorder objects.
 *
 * @param {DBConnections} connections
 * @param {string[]} ids
 */
export async function findWorkorders(connections, ids) {
  const rows = await execute(connections.pegadb, findWorkordersQuery(ids))
  const mappings = await getWorkorderMappings(connections.samdb, rows)

  return toWorkorders(rows, ids, mappings)
}

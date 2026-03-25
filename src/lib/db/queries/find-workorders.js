import Joi from 'joi'

import { toWorkorders } from '../mappers/to-workorders.js'
import { execute } from '../operations/execute.js'
import { loadSQL } from '../utils/load-sql.js'
import { getWorkAreaCodeMapping } from './get-workarea-code-mapping.js'
import { getPurposeSpeciesCodeMapping } from './get-purpose-species-code-mapping.js'
import { WorkorderIdSchema } from '../../../types/workorders.js'

/** @import { DBConnections } from '../../../types/connection.js' */

const sql = loadSQL(import.meta.filename)

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

  const quotedWorkorderIds = value.ids.map((workorderId) => `'${workorderId}'`)
  const query = sql.replace(':workorder_ids', quotedWorkorderIds.join(', '))

  return {
    sql: query
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

  let workAreaMapping = []
  let speciesMapping = []

  if (rows.length !== 0) {
    workAreaMapping = await getWorkAreaCodeMapping(connections.samdb, [
      ...new Set(rows.map((row) => row.work_area))
    ])

    speciesMapping = await getPurposeSpeciesCodeMapping(connections.samdb, [
      ...new Set(rows.map((row) => row.purpose_species))
    ])
  }

  return toWorkorders(rows, ids, { workAreaMapping, speciesMapping })
}

import Joi from 'joi'

import { toWorkorders } from '../mappers/to-workorders.js'
import { execute } from '../operations/execute.js'
import { query } from '../operations/query.js'
import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { loadSQL } from '../utils/load-sql.js'
import { getWorkAreaCodeMapping } from './get-workarea-code-mapping.js'
import { getPurposeSpeciesCodeMapping } from './get-purpose-species-code-mapping.js'
import { getCustomerTypes } from './get-customer-types.js'
import { WorkorderIdSchema } from '../../../types/workorders.js'

/** @import { DBConnections } from '../../../types/connection.js' */

const sql = loadSQL(import.meta.filename)

const WORKORDER_IDS_BIND_TOKEN = '__WORKORDER_IDS__'

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
  const sqlWithIds = sql.replace(WORKORDER_IDS_BIND_TOKEN, placeholders)

  return {
    sql: query()
      .raw(sqlWithIds, { ...bindings })
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

  let workAreaMapping = []
  let speciesMapping = []
  let customerTypeMapping = new Map()

  if (rows.length !== 0) {
    workAreaMapping = await getWorkAreaCodeMapping(connections.samdb, [
      ...new Set(rows.map((row) => row.work_area))
    ])

    speciesMapping = await getPurposeSpeciesCodeMapping(connections.samdb, [
      ...new Set(rows.map((row) => row.purpose_species))
    ])

    const customerIds = [
      ...new Set(
        rows
          .map((row) => row.customer_id)
          .filter((customerId) => typeof customerId === 'string')
      )
    ]

    if (customerIds.length !== 0) {
      customerTypeMapping = await getCustomerTypes(
        connections.samdb,
        customerIds
      )
    }
  }

  return toWorkorders(rows, ids, {
    workAreaMapping,
    speciesMapping,
    customerTypeMapping
  })
}

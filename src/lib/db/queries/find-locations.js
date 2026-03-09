import Joi from 'joi'

import { toLocations } from '../mappers/to-locations.js'
import { execute } from '../operations/execute.js'
import { loadSQL } from '../utils/load-sql.js'
import { LocationIdSchema } from '../../../types/locations.js'

const sql = loadSQL(import.meta.filename)

const FindLocationsSchema = Joi.object({
  ids: Joi.array()
    .items(LocationIdSchema)
    .min(1)
    .required()
    .description('Location ids')
})

/**
 * @param {Array<string>} ids
 * @returns {{ sql: string; }} The query and its bindings
 */
export function findLocationsQuery(ids) {
  const { value, error } = FindLocationsSchema.validate({ ids })

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const quotedLocationIds = value.ids.map((locationId) => `'${locationId}'`)
  const query = sql.replaceAll(':locationIds', quotedLocationIds.join(', '))

  return {
    sql: query
  }
}

/**
 * @param {import('oracledb').Connection} connection
 * @param {string[]} ids
 */
export async function findLocations(connection, ids) {
  const query = findLocationsQuery(ids)

  const rows = await execute(connection, query)

  return toLocations(rows, ids)
}

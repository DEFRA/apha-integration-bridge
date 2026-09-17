import Joi from 'joi'
import { loadSQL } from '../utils/load-sql.js'
import { LocationIdSchema } from '../../../types/locations.js'

const sql = loadSQL(import.meta.filename)

export const GetLocationSchema = Joi.object({
  locationId: LocationIdSchema.description('Location ID (e.g., L97339)')
})

/**
 * @returns {{ sql: string; bindings: Record<string, unknown> }} The query and its bindings
 */
export function getLocation(locationId) {
  const { value, error } = GetLocationSchema.validate({ locationId })
  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  return {
    sql,
    bindings: { location: value.locationId }
  }
}

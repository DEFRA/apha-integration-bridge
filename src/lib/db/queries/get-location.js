import Joi from 'joi'
import { findLocationsQuery } from './find-locations.js'
import { LocationIdSchema } from '../../../types/locations.js'

export const GetLocationSchema = Joi.object({
  locationId: LocationIdSchema.description('Location ID (e.g., L97339)')
})

/**
 * The location's rows from find-locations.sql, the query `POST /locations/find`
 * runs
 *
 * @returns {{ sql: string; bindings: Record<string, unknown> }} The query and its bindings
 */
export function getLocation(locationId) {
  const { value, error } = GetLocationSchema.validate({ locationId })
  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  return findLocationsQuery([value.locationId])
}

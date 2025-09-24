import Joi from 'joi'
import { loadSQL } from '../utils/load-sql.js'
import { query } from '../operations/query.js'

const sql = loadSQL(import.meta.filename)

export const GetLocationSchema = Joi.object({
  locationId: Joi.string()
    .trim()
    .pattern(/^L\d+$/)
    .required()
    .description('Location ID (e.g., L97339)')
})

/**
 * @typedef {Record<string, Array<(value: unknown) => unknown>>} Marshallers
 * @typedef {{ sql: string; bindings: readonly unknown[]; marshallers?: Marshallers }} Query
 *
 * @returns {{ sql: string; }} The query and its bindings
 */
export function getLocation(locationId) {
  const { value, error } = GetLocationSchema.validate({ locationId })
  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  return {
    sql: query().raw(sql, { location: value.locationId }).toString()
  }
}

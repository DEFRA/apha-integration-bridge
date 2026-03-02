import { toLocation } from './to-location.js'

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string[]} ids
 */
export const toLocations = (rows, ids) => {
  const locationMap = new Map()

  for (const row of rows) {
    toLocation(row, locationMap)
  }

  return ids
    .map((id) => locationMap.get(id))
    .filter((location) => location !== undefined)
}

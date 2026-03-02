import { toLocation } from './to-location.js'

/**
 * Maps database rows to location objects, preserving the order of requested IDs
 * @param {Record<string, unknown>[]} rows
 * @param {string[]} ids - The IDs in the order they were requested
 */
export const toLocations = (rows, ids) => {
  const locationMap = new Map()

  // Process all rows and accumulate locations with their units/facilities
  for (const row of rows) {
    toLocation(row, locationMap)
  }

  // Return locations in the order they were requested
  return ids
    .map((id) => locationMap.get(id))
    .filter((location) => location !== undefined)
}

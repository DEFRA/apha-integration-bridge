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

  // Deduplicate holdings for each location
  for (const location of locationMap.values()) {
    if (location.relationships?.holdings?.data) {
      const uniqueHoldings = new Map()
      for (const holding of location.relationships.holdings.data) {
        uniqueHoldings.set(holding.id, holding)
      }
      location.relationships.holdings.data = Array.from(uniqueHoldings.values())
    }
  }

  return ids
    .map((id) => locationMap.get(id))
    .filter((location) => location !== undefined)
}

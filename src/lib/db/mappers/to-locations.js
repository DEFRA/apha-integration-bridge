import { toLocation } from './to-location.js'

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string[]} ids
 */
export const toLocations = (rows, ids) => {
  const locations = new Map()
  const livestockUnitKeys = new Map()
  const facilityKeys = new Map()
  const holdingKeys = new Map()

  for (const row of rows) {
    const mapped = toLocation(row)

    if (!mapped) {
      continue
    }

    if (!locations.has(mapped.id)) {
      locations.set(mapped.id, mapped)
      livestockUnitKeys.set(
        mapped.id,
        new Set(mapped.livestockUnits.map((lu) => lu.id))
      )
      facilityKeys.set(mapped.id, new Set(mapped.facilities.map((f) => f.id)))
      holdingKeys.set(
        mapped.id,
        new Set(mapped.relationships.holdings.data.map((h) => h.id))
      )
      continue
    }

    // Location already exists - merge data from this row
    const location = locations.get(mapped.id)

    if (!location) {
      continue
    }

    // Merge livestock units and avoid duplicates
    for (const livestockUnit of mapped.livestockUnits) {
      if (!livestockUnitKeys.get(mapped.id)?.has(livestockUnit.id)) {
        location.livestockUnits.push(livestockUnit)
        livestockUnitKeys.get(mapped.id)?.add(livestockUnit.id)
      }
    }

    // Merge facilities and avoid duplicates
    for (const facility of mapped.facilities) {
      if (!facilityKeys.get(mapped.id)?.has(facility.id)) {
        location.facilities.push(facility)
        facilityKeys.get(mapped.id)?.add(facility.id)
      }
    }

    // Merge holdings and avoid duplicates
    for (const holding of mapped.relationships.holdings.data) {
      if (!holdingKeys.get(mapped.id)?.has(holding.id)) {
        location.relationships.holdings.data.push(holding)
        holdingKeys.get(mapped.id)?.add(holding.id)
      }
    }
  }

  return ids
    .map((id) => locations.get(id))
    .filter((location) => location !== undefined)
}

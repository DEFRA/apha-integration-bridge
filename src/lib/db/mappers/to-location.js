import { asNullableString } from './as-nullable-string.js'
import { createLocation } from './create-location.js'

/**
 * Helper to convert 'N/A' to null, otherwise return the value as nullable string
 * @param {unknown} value
 * @returns {string | null}
 */
const asNullableOrNA = (value) => {
  const str = asNullableString(value)
  return str === 'N/A' ? null : str
}

/**
 * @param {Record<string, unknown>} row
 * @param {Map<string, any>} locationMap
 */
export const toLocation = (row, locationMap) => {
  const locationId = asNullableString(row.location_id)

  if (!locationId) {
    return null
  }

  // Create location if it doesn't exist
  if (!locationMap.has(locationId)) {
    const location = createLocation(row, locationId)
    locationMap.set(locationId, location)
  }

  const location = locationMap.get(locationId)
  const unitId = asNullableOrNA(row.unit_id)
  const unitType = asNullableOrNA(row.unit_type)
  const cph = asNullableString(row.cph)

  // Add livestock unit
  if (unitId && unitType === 'LU') {
    const existingLU = location.livestockUnits.find((lu) => lu.id === unitId)
    if (!existingLU) {
      location.livestockUnits.push({
        type: 'animal-commodities',
        id: unitId,
        animalQuantities: row.usual_quantity_of_animals ?? 0,
        species: asNullableOrNA(row.species)
      })
    }
  }

  // Add facility
  if (unitId && unitType === 'F') {
    const existingFacility = location.facilities.find((f) => f.id === unitId)
    if (!existingFacility) {
      location.facilities.push({
        type: 'facilities',
        id: unitId,
        name: asNullableOrNA(row.facility_name),
        facilityType: asNullableOrNA(row.facility_type),
        businessActivity: asNullableOrNA(row.business_activity)
      })
    }
  }

  // Add holding relationship
  if (cph) {
    const existingHolding = location.relationships.holdings.data.find(
      (h) => h.id === cph
    )
    if (!existingHolding) {
      location.relationships.holdings.data.push({
        type: 'holdings',
        id: cph
      })
    }
  }

  return location
}

import { asNullableString } from './as-nullable-string.js'
import { createLocation } from './create-location.js'

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
  const unitId = asNullableString(row.unit_id)
  const unitType = asNullableString(row.unit_type)

  // Add livestock unit
  if (unitId && unitType === 'LU') {
    const existingLU = location.livestockUnits.find((lu) => lu.id === unitId)
    if (!existingLU) {
      location.livestockUnits.push({
        type: 'animal-commodities',
        id: unitId,
        animalQuantities: row.usual_quantity_of_animals ?? 0,
        species: null
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
        name: null,
        facilityType: null,
        businessActivity: null
      })
    }
  }

  return location
}

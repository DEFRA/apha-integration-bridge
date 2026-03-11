import { asNullableString } from './as-nullable-string.js'
import { asNullableOrNAString } from './as-nullable-or-na-string.js'
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
  const unitId = asNullableOrNAString(row.unit_id)
  const unitType = asNullableOrNAString(row.unit_type)
  const cph = asNullableString(row.cph)

  // Add livestock unit
  if (unitId && unitType === 'LU') {
    const existingLU = location.livestockUnits.find((lu) => lu.id === unitId)
    if (!existingLU) {
      location.livestockUnits.push({
        type: 'animal-commodities',
        id: unitId,
        animalQuantities: row.usual_quantity_of_animals ?? 0,
        species: asNullableOrNAString(row.species)
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
        name: asNullableOrNAString(row.facility_name),
        facilityType: asNullableOrNAString(row.facility_type),
        businessActivity: asNullableOrNAString(row.business_activity)
      })
    }
  }

  // Add holding relationship
  if (cph) {
    location.relationships.holdings.data.push({
      type: 'holdings',
      id: cph
    })
  }

  return location
}

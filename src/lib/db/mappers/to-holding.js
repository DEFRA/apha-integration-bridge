import { asNullableString } from './as-nullable-string.js'
import { createHolding } from './create-holding.js'

/**
 * @param {Record<string, unknown>} row
 */
export const toHolding = (row) => {
  const id = asNullableString(row.cph_id)

  if (!id) {
    return null
  }

  const holding = createHolding(row, id)

  const locationId = asNullableString(row.location_id)
  const cphHolderId = asNullableString(row.party_id)

  if (locationId) {
    holding.relationships.location.data = {
      type: 'locations',
      id: locationId
    }
  }

  if (cphHolderId) {
    holding.relationships.cphHolder.data = {
      type: 'customers',
      id: cphHolderId
    }
  }

  return holding
}

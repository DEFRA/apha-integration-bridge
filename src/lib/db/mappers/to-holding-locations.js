import { asNullableDate } from './as-nullable-date.js'
import { asNullableString } from './as-nullable-string.js'
import { bySelectedHoldership } from './by-selected-holdership.js'
import { toStructuredLocations } from './to-structured-locations.js'

/**
 * The items of `GET /holdings/{countyId}/{parishId}/{holdingId}/locations`:
 * one per holdership, the selected one first. Each is the location as
 * `POST /locations/find` returns it, plus the holdership itself, so a
 * location held under two holderships appears twice.
 *
 * @param {Record<string, unknown>[]} holderships find-holdings.sql rows for one CPH
 * @param {Record<string, unknown>[]} locationRows find-locations.sql rows for their locations
 * @param {Record<string, unknown>[]} subLocationRows find-sub-locations.sql rows for their features
 */
export const toHoldingLocations = (
  holderships,
  locationRows,
  subLocationRows
) => {
  const locationIds = [
    ...new Set(
      holderships.map((holdership) => asNullableString(holdership.location_id))
    )
  ]

  const locations = new Map(
    toStructuredLocations(locationRows, subLocationRows, locationIds).map(
      (location) => [location.id, location]
    )
  )

  return holderships
    .toSorted(bySelectedHoldership)
    .flatMap((holdership, index) => {
      const location = locations.get(asNullableString(holdership.location_id))

      // find-locations.sql returns no row for a location without a FEATURE row,
      // which SAM's foreign key rules out
      if (!location) {
        return []
      }

      return {
        ...location,
        holdership: {
          vetnetCoreId: asNullableString(holdership.vetnet_core_id),
          from: asNullableDate(holdership.feature_involv_from_date),
          cphType: asNullableString(holdership.cph_type),
          selected: index === 0
        }
      }
    })
}

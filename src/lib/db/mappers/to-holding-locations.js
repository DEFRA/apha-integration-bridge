import { mask } from '../../pii/index.js'
import { asNullableDate, asNullableTimestamp } from './as-nullable-date.js'
import { asNullableNumber } from './as-nullable-number.js'
import { asNullableString } from './as-nullable-string.js'
import { bySelectedHoldership } from './by-selected-holdership.js'
import { toAddress } from './to-address.js'
import { toLocations } from './to-locations.js'

/**
 * @param {Record<string, unknown>} row a holdership or sub-location row
 */
const toStatus = (row) => {
  const code = asNullableString(row.feature_status_code)

  if (!code) {
    return null
  }

  return {
    code,
    reasonCode: asNullableString(row.feature_state_reason_code),
    since: asNullableTimestamp(row.feature_state_from_dttm)
  }
}

/**
 * @param {Record<string, unknown>} row a find-sub-locations.sql row
 */
const stateTime = (row) =>
  row.feature_state_from_dttm instanceof Date
    ? row.feature_state_from_dttm.getTime()
    : Number.NEGATIVE_INFINITY

/**
 * The current primary point. An easting or northing missing or outside the
 * national grid (0 to 700,000 east, 0 to 1,300,000 north) makes both `null`,
 * as find-locations.sql already does for a stored 0; the map reference is
 * returned as stored.
 *
 * @param {Record<string, unknown>} row a find-locations.sql row
 */
const toPosition = (row) => {
  const easting = asNullableNumber(row.easting)
  const northing = asNullableNumber(row.northing)
  const onGrid =
    easting !== null &&
    northing !== null &&
    easting >= 0 &&
    easting <= 700_000 &&
    northing >= 0 &&
    northing <= 1_300_000

  const position = {
    easting: onGrid ? easting : null,
    northing: onGrid ? northing : null,
    osMapReference: asNullableString(row.os_map_reference),
    pointType: asNullableString(row.feature_point_type)
  }

  return Object.values(position).some((value) => value !== null)
    ? position
    : null
}

/**
 * Every current address of a location, once each and in the order
 * find-locations.sql ranks them, so the first is the preferred one.
 *
 * @param {Record<string, unknown>[]} rows the location's find-locations.sql rows
 */
const toAddresses = (rows) => {
  const addresses = new Map()

  for (const row of rows.toSorted(
    (a, b) => Number(a.address_rank) - Number(b.address_rank)
  )) {
    const key = asNullableNumber(row.feature_address_pk)

    if (key === null || addresses.has(key)) {
      continue
    }

    addresses.set(key, {
      ...toAddress(row),
      isPreferred: row.address_rank === 1,
      from: asNullableDate(row.feature_address_from_date)
    })
  }

  return [...addresses.values()]
}

/**
 * @param {Record<string, unknown>} row a find-sub-locations.sql row
 */
const toSubLocation = (row) => ({
  type: 'sub-locations',
  id: String(row.feature_pk),
  name: mask(asNullableString(row.feature_name)),
  subLocationType: asNullableString(row.sub_location_type),
  usableArea: asNullableNumber(row.usable_area),
  usualStockQuantity: asNullableNumber(row.usual_stock_quantity),
  broilerStockingDensityRange: asNullableString(
    row.broiler_stockg_density_range
  ),
  status: toStatus(row),
  // find-sub-locations.sql reads no point for a sub-location, and SAM's
  // development database holds none
  position: null
})

/**
 * The items of `GET /holdings/{countyId}/{parishId}/{holdingId}/locations`:
 * one per holdership, the selected one first. Each is the location as
 * `POST /locations/find` returns it, with its preferred address in `address`,
 * plus its status, position, every current address, its sub-locations and the
 * holdership itself, so a location held under two holderships appears twice.
 *
 * @param {Record<string, unknown>[]} holderships find-holdings.sql rows for one CPH
 * @param {Record<string, unknown>[]} locationRows find-locations.sql rows for their locations
 * @param {Record<string, unknown>[]} subLocationRows find-sub-locations.sql rows for their features
 */
export const toHoldingLocations = (
  holderships,
  locationRows,
  subLocationRows
) =>
  holderships.toSorted(bySelectedHoldership).flatMap((holdership, index) => {
    const locationId = asNullableString(holdership.location_id)
    const rows = locationRows.filter((row) => row.location_id === locationId)
    const [location] = toLocations(rows, [locationId])

    // find-locations.sql returns no row for a location without a FEATURE row,
    // which SAM's foreign key rules out
    if (!location) {
      return []
    }

    const addresses = toAddresses(rows)

    // the preferred address, or every member null when SAM holds none
    const { isPreferred, from, ...address } = addresses[0] ?? toAddress(rows[0])

    // keyed by feature, keeping the latest of several current states
    const subLocations = new Map()

    for (const row of subLocationRows) {
      const listed = subLocations.get(row.feature_pk)

      if (
        row.premises_feature_pk === holdership.feature_pk &&
        (!listed || stateTime(row) > stateTime(listed))
      ) {
        subLocations.set(row.feature_pk, row)
      }
    }

    return {
      ...location,
      address,
      status: toStatus(holdership),
      addresses,
      position: toPosition(rows[0]),
      subLocations: [...subLocations.values()].map(toSubLocation),
      holdership: {
        vetnetCoreId: asNullableString(holdership.vetnet_core_id),
        from: asNullableDate(holdership.feature_involv_from_date),
        cphType: asNullableString(holdership.cph_type),
        selected: index === 0
      }
    }
  })

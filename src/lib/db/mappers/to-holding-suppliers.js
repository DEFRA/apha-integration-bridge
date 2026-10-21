import { asNullableDate } from './as-nullable-date.js'
import { toSupplier } from './to-supplier.js'

/**
 * The items of `GET /holdings/{countyId}/{parishId}/{holdingId}/suppliers`:
 * one per supplier, in the order of its first involvement, with the supplier
 * roles behind its involvements in `supplierTypes` and an `involvements` entry
 * for each of its current involvements with a livestock unit at a location.
 *
 * @param {Record<string, unknown>[]} rows find-supplier-involvements.sql rows for the CPH's features
 */
export const toHoldingSuppliers = (rows) =>
  [...Map.groupBy(rows, (row) => row.party_pk).values()].map((supplierRows) => {
    // keyed by involvement and location, so a row repeated by a second current
    // version of the party is still one entry
    const involvements = new Map()

    for (const row of supplierRows) {
      involvements.set(`${row.involvement_pk}:${row.location_id}`, {
        involvementType: row.involvement_type,
        locationId: row.location_id,
        livestockUnitId: row.livestock_unit_id,
        from: asNullableDate(row.involvement_from_date)
      })
    }

    return {
      type: 'suppliers',
      ...toSupplier(supplierRows[0]),
      supplierTypes: [
        ...new Set(supplierRows.map((row) => String(row.role_type)))
      ],
      involvements: [...involvements.values()]
    }
  })

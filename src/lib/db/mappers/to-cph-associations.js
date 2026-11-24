import { asNullableString } from './as-nullable-string.js'

/**
 * @param {string[]} list
 * @param {unknown} value
 */
const addOnce = (list, value) => {
  const string = asNullableString(value)

  if (string !== null && !list.includes(string)) {
    list.push(string)
  }
}

/**
 * Groups find-party-cph-associations.sql rows into one association per CPH
 * and role, in the query's order. A row with no location or unit still adds
 * the association, with an empty list.
 *
 * @param {Record<string, unknown>[]} rows find-party-cph-associations.sql rows
 */
export const toCphAssociations = (rows) => {
  const associations = new Map()

  for (const row of rows) {
    const key = `${row.cph}|${row.main_role_type}|${row.role_type}`

    let association = associations.get(key)

    if (association === undefined) {
      association = {
        cph: String(row.cph),
        role: {
          mainRoleType: asNullableString(row.main_role_type),
          roleType: asNullableString(row.role_type),
          roleName: asNullableString(row.role_name)
        },
        involvementTypes: [],
        locationIds: [],
        livestockUnitIds: []
      }

      associations.set(key, association)
    }

    addOnce(association.involvementTypes, row.involvement_type)
    addOnce(association.locationIds, row.location_id)
    addOnce(association.livestockUnitIds, row.livestock_unit_id)
  }

  for (const association of associations.values()) {
    association.involvementTypes.sort()
    association.locationIds.sort()
    association.livestockUnitIds.sort()
  }

  return Array.from(associations.values())
}

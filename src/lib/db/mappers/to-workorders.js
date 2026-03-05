import { toWorkorder } from './to-workorder.js'

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string[]} ids
 */
export const toWorkorders = (rows, ids) => {
  const workorders = new Map()
  const activityKeys = new Map()
  const facilityKeys = new Map()
  const livestockUnitKeys = new Map()

  for (const row of rows) {
    const mapped = toWorkorder(row)

    if (!mapped) {
      continue
    }

    if (!workorders.has(mapped.id)) {
      workorders.set(mapped.id, mapped)
      activityKeys.set(
        mapped.id,
        new Set(mapped.activities.map((activity) => activity))
      )
      facilityKeys.set(
        mapped.id,
        new Set(
          mapped.relationships.facilities.data.map(
            (relationship) => relationship.id
          )
        )
      )
      livestockUnitKeys.set(
        mapped.id,
        new Set(
          mapped.relationships.livestockUnits.data.map(
            (relationship) => relationship.id
          )
        )
      )
      continue
    }

    const workorder = workorders.get(mapped.id)

    if (!workorder) {
      continue
    }

    for (const activity of mapped.activities) {
      if (!activityKeys.get(mapped.id)?.has(activity)) {
        workorder.activities.push(activity)
        activityKeys.get(mapped.id)?.add(activity)
      }
    }

    for (const relationship of mapped.relationships.livestockUnits.data) {
      if (!livestockUnitKeys.get(mapped.id)?.has(relationship.id)) {
        workorder.relationships.livestockUnits.data.push(relationship)
        livestockUnitKeys.get(mapped.id)?.add(relationship.id)
      }
    }

    for (const relationship of mapped.relationships.facilities.data) {
      if (!facilityKeys.get(mapped.id)?.has(relationship.id)) {
        workorder.relationships.facilities.data.push(relationship)
        facilityKeys.get(mapped.id)?.add(relationship.id)
      }
    }
  }

  return ids
    .map((id) => workorders.get(id))
    .filter((workorder) => workorder !== undefined)
}

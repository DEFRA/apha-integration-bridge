import { asNullableString } from './as-nullable-string.js'
import { createWorkorder } from './create-workorder.js'
import { toActivity } from './to-activity.js'

/** @import {WorkorderMappings} from '../../../types/find/workorders.js' */

/**
 * @param {Record<string, unknown>} row
 */
const toCustomerOrOrganisationType = (row) => {
  const customerType = asNullableString(row.customer_type)?.toUpperCase()

  if (customerType === 'PERSON') {
    return 'customers'
  }

  if (customerType === 'ORGANISATION') {
    return 'organisations'
  }

  return null
}

/**
 * @param {Record<string, unknown>} row
 * @param {WorkorderMappings} mappings
 */
export const toWorkorder = (row, mappings) => {
  const id = asNullableString(row.work_order_id)

  if (!id) {
    return null
  }

  const workorder = createWorkorder(row, id, mappings)

  const customerOrOrganisationId = asNullableString(row.customer_id)
  const holdingId = asNullableString(row.cph)
  const facilitiesId = asNullableString(row.facility_unit_id)
  const locationId = asNullableString(row.location_id)
  const livestockUnitId = asNullableString(row.livestock_unit_id)

  const activity = toActivity(row)
  if (activity.id) {
    workorder.activities.push(activity)
  }

  if (customerOrOrganisationId) {
    const type = toCustomerOrOrganisationType(row)

    if (type) {
      workorder.relationships.customerOrOrganisation.data = {
        type,
        id: customerOrOrganisationId
      }
    }
  }

  if (holdingId) {
    workorder.relationships.holding.data = {
      type: 'holdings',
      id: holdingId
    }
  }

  if (facilitiesId) {
    workorder.relationships.facilities.data.push({
      type: 'facilities',
      id: facilitiesId
    })
  }

  if (locationId) {
    workorder.relationships.location.data = {
      type: 'locations',
      id: locationId
    }
  }

  if (livestockUnitId) {
    workorder.relationships.livestockUnits.data.push({
      type: 'animal-commodities',
      id: livestockUnitId
    })
  }

  return workorder
}

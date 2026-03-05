import { asNullableString } from './as-nullable-string.js'

/**
 * @import {Workorders} from '../../../types/find/workorders.js'
 */

const type = /** @type {'workorders'} */ ('workorders')

/**
 * @param {Record<string, unknown>} row
 * @param {string} id
 * @return {Workorders}
 */
export const createWorkorder = (row, id) => {
  const workorder = {
    type,
    id,
    activationDate: asNullableString(row.wsactivationdate),
    businessArea: asNullableString(row.business_area),
    workArea: asNullableString(row.work_area),
    country: asNullableString(row.country),
    aim: asNullableString(row.aim),
    purpose: asNullableString(row.purpose),
    earliestActivityStartDate: asNullableString(
      row.wsearliestactivitystartdate
    ),
    species: asNullableString(row.purpose_species),
    activities: [],
    phase: asNullableString(row.phase),
    relationships: {
      customerOrOrganisation: {
        data: null
      },
      holding: {
        data: null
      },
      facilities: {
        data: []
      },
      location: {
        data: null
      },
      livestockUnits: {
        data: []
      }
    }
  }

  return workorder
}

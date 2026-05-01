import { asNullableString } from './as-nullable-string.js'

/**
 * @import {WorkorderMappings, Workorders} from '../../../types/find/workorders.js'
 */

const type = /** @type {'workorders'} */ ('workorders')

/**
 * @param {Record<string, unknown>} row
 * @param {string} id
 * @param {WorkorderMappings} mappings
 * @return {Workorders}
 */
export const createWorkorder = (row, id, mappings) => {
  const workorder = {
    type,
    id,
    activationDate: asNullableString(row.wsactivationdate),
    updatedDate: asNullableString(row.updated_date),
    targetDate: asNullableString(row.target_date),
    businessArea: asNullableString(row.business_area),
    workArea: asNullableString(
      mappings.workAreaMapping?.find(
        (mapping) => mapping.work_area_code === row.work_area
      )?.work_area_desc ?? row.work_area
    ),
    country: asNullableString(row.country),
    aim: asNullableString(row.aim),
    purpose: asNullableString(row.purpose),
    earliestActivityStartDate: asNullableString(
      row.wsearliestactivitystartdate
    ),
    species: asNullableString(
      mappings.speciesMapping?.find(
        (mapping) => mapping.purpose_species_code === row.purpose_species
      )?.purpose_species_desc ?? row.purpose_species
    ),
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

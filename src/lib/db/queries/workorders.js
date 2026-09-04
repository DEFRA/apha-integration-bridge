import { loadSQL } from '../utils/load-sql.js'
import { getWorkAreaCodeMapping } from './get-workarea-code-mapping.js'
import { getPurposeSpeciesCodeMapping } from './get-purpose-species-code-mapping.js'
import { getCustomerTypes } from './get-customer-types.js'

/** @import { WorkorderMappings } from '../../../types/find/workorders.js' */

/**
 * The part of the work order query both endpoints share. Each endpoint's own
 * SQL file holds the WITH clause that picks the work order ids and is
 * prepended to this; workorders.sql says what that clause has to provide.
 */
export const workordersSQL = loadSQL(import.meta.filename)

/**
 * @param {unknown[]} values
 * @returns {string[]}
 */
const distinctStrings = (values) => [
  ...new Set(values.filter((value) => typeof value === 'string'))
]

/**
 * Looks up the descriptions and customer types the workorder mapper needs for
 * a set of rows. Rows with no work area, species or customer contribute
 * nothing, and a lookup with nothing to look up is not run at all.
 *
 * @param {import('oracledb').Connection} samdb
 * @param {Record<string, unknown>[]} rows
 * @returns {Promise<WorkorderMappings>}
 */
export async function getWorkorderMappings(samdb, rows) {
  const workAreaCodes = distinctStrings(rows.map((row) => row.work_area))
  const speciesCodes = distinctStrings(rows.map((row) => row.purpose_species))
  const customerIds = distinctStrings(rows.map((row) => row.customer_id))

  let workAreaMapping = []
  let speciesMapping = []
  let customerTypeMapping = new Map()

  if (workAreaCodes.length !== 0) {
    workAreaMapping = await getWorkAreaCodeMapping(samdb, workAreaCodes)
  }

  if (speciesCodes.length !== 0) {
    speciesMapping = await getPurposeSpeciesCodeMapping(samdb, speciesCodes)
  }

  if (customerIds.length !== 0) {
    customerTypeMapping = await getCustomerTypes(samdb, customerIds)
  }

  return { workAreaMapping, speciesMapping, customerTypeMapping }
}

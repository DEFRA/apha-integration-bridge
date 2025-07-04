import Joi from 'joi'

import { query } from '../operations/query.js'
import { obfuscate } from '../marshallers/obfuscate.js'

/**
 * @typedef {import('joi')} Joi
 */

/**
 * Schema for validating parameters to fetch units from the database
 *
 * @typedef {Object} GetUnitsSchema
 * @property {string} countyId - The ID of the county
 * @property {string} parishId - The ID of the parish
 * @property {string} holdingId - The ID of the holdings
 */
export const GetUnitsSchema = Joi.object({
  countyId: Joi.string().length(2).required().description('County ID'),
  parishId: Joi.string().length(3).required().description('Parish ID'),
  holdingId: Joi.string().length(4).required().description('Holding ID')
})

/**
 * @typedef {Record<string, Array<(value: unknown) => unknown>>} Marshallers
 * @typedef {{ sql: string; bindings: readonly unknown[]; marshallers?: Marshallers }} Query
 *
 * @param {GetUnitsSchema} parameters Parameters required to build the query for fetching units
 * @returns {Query} the query builder for fetching units
 */
export function getUnitsQuery(parameters) {
  /**
   * validate parameters first
   */
  const { value, error } = GetUnitsSchema.validate(parameters)

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const cph = `${value.countyId}/${value.parishId}/${value.holdingId}`

  const { sql, bindings } = query()
    .select(
      'cph',
      'location_id',
      'feature_name',
      'main_role_type',
      'person_family_name',
      'person_given_name',
      'organisation_name',
      'party_id',
      'asset_id',
      'asset_location_type',
      'asset_type',
      'animal_species_code',
      'animal_group_id_mch_ext_ref',
      'animal_group_id_mch_frm_dat',
      'animal_group_id_mch_to_dat',
      'animal_production_usage_code',
      'asset_involvement_type',
      'cph_type',
      'herdmark',
      'keeper_of_unit',
      'property_number',
      'postcode',
      'owner_of_unit'
    )
    .from('ahbrp.v_cph_customer_unit')
    .where('cph', `LIKE`, cph)
    .toSQL()

  return {
    sql,
    bindings,
    marshallers: {
      person_family_name: [obfuscate],
      person_given_name: [obfuscate],
      oraganisation_name: [obfuscate],
      property_number: [obfuscate]
    }
  }
}

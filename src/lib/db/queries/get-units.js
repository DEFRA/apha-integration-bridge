import Joi from 'joi'

import { query } from '../operations/query.js'

export const GetUnitsSchema = Joi.object({
  countyId: Joi.string().required().description('County ID'),
  parishId: Joi.string().required().description('Parish ID'),
  holdingsId: Joi.string().required().description('Holdings ID')
})

/**
 * @param {*} parameters
 * @returns {import('knex').Knex.Sql} the query builder for fetching units
 */
export function getUnitsQuery(parameters) {
  /**
   * validate parameters first
   */
  const { value, error } = GetUnitsSchema.validate(parameters)

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const cph = `${value.countyId}/${value.parishId}/${value.holdingsId}`

  return query()
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
}

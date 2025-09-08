import Joi from 'joi'
import { query } from '../operations/query.js'

/**
 * @typedef {import('joi')} Joi
 */

export const GetLocationSchema = Joi.object({
  locationId: Joi.string()
    .trim()
    .pattern(/^L\d+$/)
    .required()
    .description('Location ID (e.g., L97339)')
})

/**
 * @typedef {Record<string, Array<(value: unknown) => unknown>>} Marshallers
 * @typedef {{ sql: string; bindings: readonly unknown[]; marshallers?: Marshallers }} Query
 *
 * Returns BS7666 address fields and any linked Livestock Units ("LU") or Facilities ("F")
 * for the given location, using UNION to deduplicate rows if needed.
 *
 * @param {string} locationId
 * @returns {Query}
 */
export function getLocation(locationId) {
  const { value, error } = GetLocationSchema.validate({ locationId })
  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const knex = query()

  // First branch: Livestock Units
  const luQb = knex
    .from({ loc: 'ahbrp.location' })
    .join({ fa: 'ahbrp.feature_address' }, 'loc.feature_pk', 'fa.feature_pk')
    .join({ fs: 'ahbrp.feature_state' }, 'loc.feature_pk', 'fs.feature_pk')
    .join({ ba: 'ahbrp.bs7666_address' }, 'fa.address_pk', 'ba.address_pk')
    .join({ al: 'ahbrp.asset_location' }, 'loc.feature_pk', 'al.feature_pk')
    .join({ lu: 'ahbrp.livestock_unit' }, 'al.asset_pk', 'lu.asset_pk')
    .join({ ass: 'ahbrp.asset_state' }, 'lu.asset_pk', 'ass.asset_pk')
    .whereNull('fa.feature_address_to_date')
    .whereNull('al.asset_location_to_date')
    .where('al.asset_location_type', 'PRIMARYLOCATION')
    .where('ass.asset_status_code', '<>', 'INACTIVE')
    .whereNull('ass.asset_state_to_dttm')
    .where('fs.feature_status_code', '<>', 'INACTIVE')
    .whereNull('fs.feature_state_to_dttm')
    .where('loc.location_id', value.locationId)
    .select({
      locationId: 'loc.location_id',
      paonStartNumber: 'ba.paon_start_number',
      paonStartNumberSuffix: 'ba.paon_start_number_suffix',
      paonEndNumber: 'ba.paon_end_number',
      paonEndNumberSuffix: 'ba.paon_end_number_suffix',
      paonDescription: 'ba.paon_description',
      saonDescription: 'ba.saon_description',
      saonStartNumber: 'ba.saon_start_number',
      saonStartNumberSuffix: 'ba.saon_start_number_suffix',
      saonEndNumber: 'ba.saon_end_number',
      saonEndNumberSuffix: 'ba.saon_end_number_suffix',
      street: 'ba.street',
      locality: 'ba.locality',
      town: 'ba.town',
      administrativeAreaCounty: 'ba.administrative_area', // ADMINISTRATIVE_AREA as COUNTY in the raw SQL
      postcode: 'ba.postcode',
      ukInternalCode: 'ba.uk_internal_code',
      countryCode: 'ba.country_code',
      unitId: 'lu.unit_id'
    })
    .select(knex.raw(`'LU' as "unitType"`))

  const facQb = knex
    .from({ loc: 'ahbrp.location' })
    .join({ fa: 'ahbrp.feature_address' }, 'loc.feature_pk', 'fa.feature_pk')
    .join({ fs: 'ahbrp.feature_state' }, 'loc.feature_pk', 'fs.feature_pk')
    .join({ ba: 'ahbrp.bs7666_address' }, 'fa.address_pk', 'ba.address_pk')
    .join({ al: 'ahbrp.asset_location' }, 'loc.feature_pk', 'al.feature_pk')
    .join({ facility: 'ahbrp.facility' }, 'al.asset_pk', 'facility.asset_pk')
    .join({ ass: 'ahbrp.asset_state' }, 'facility.asset_pk', 'ass.asset_pk')
    .whereNull('fa.feature_address_to_date')
    .whereNull('al.asset_location_to_date')
    .where('al.asset_location_type', 'PRIMARYLOCATION')
    .where('ass.asset_status_code', '<>', 'INACTIVE')
    .whereNull('ass.asset_state_to_dttm')
    .where('fs.feature_status_code', '<>', 'INACTIVE')
    .whereNull('fs.feature_state_to_dttm')
    .where('loc.location_id', value.locationId)
    .select({
      locationId: 'loc.location_id',
      paonStartNumber: 'ba.paon_start_number',
      paonStartNumberSuffix: 'ba.paon_start_number_suffix',
      paonEndNumber: 'ba.paon_end_number',
      paonEndNumberSuffix: 'ba.paon_end_number_suffix',
      paonDescription: 'ba.paon_description',
      saonDescription: 'ba.saon_description',
      saonStartNumber: 'ba.saon_start_number',
      saonStartNumberSuffix: 'ba.saon_start_number_suffix',
      saonEndNumber: 'ba.saon_end_number',
      saonEndNumberSuffix: 'ba.saon_end_number_suffix',
      street: 'ba.street',
      locality: 'ba.locality',
      town: 'ba.town',
      county: 'ba.administrative_area',
      postcode: 'ba.postcode',
      ukInternalCode: 'ba.uk_internal_code',
      countryCode: 'ba.country_code',
      unitId: 'facility.unit_id'
    })
    .select(knex.raw(`'F' as "unitType"`))

  const qb = luQb.union([facQb])

  const { sql, bindings } = qb.toSQL()
  return { sql, bindings }
}

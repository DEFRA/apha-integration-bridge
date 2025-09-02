import Joi from 'joi'
import { query } from '../operations/query.js'

/**
 * @typedef {import('joi')} Joi
 */

export const FindHoldingSchema = Joi.object({
  countyId: Joi.string()
    .length(2)
    .regex(/^\d+$/)
    .required()
    .description('County ID'),
  parishId: Joi.string()
    .length(3)
    .regex(/^\d+$/)
    .required()
    .description('Parish ID'),
  holdingId: Joi.string()
    .length(4)
    .regex(/^\d+$/)
    .required()
    .description('Holding ID')
})

/**
 * @typedef {Record<string, Array<(value: unknown) => unknown>>} Marshallers
 * @typedef {{ sql: string; bindings: readonly unknown[]; marshallers?: Marshallers }} Query
 *
 * @param {unknown} parameters
 * @returns {Query}
 */
export function findHoldingQuery(parameters) {
  const { value, error } = FindHoldingSchema.validate(parameters)
  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const cph = `${value.countyId}/${value.parishId}/${value.holdingId}`

  // Use the knex instance returned by query()
  const knex = query()

  const qb = knex
    .from({ cph: 'ahbrp.cph' })
    .join({ fi: 'ahbrp.feature_involvement' }, 'cph.cph', 'fi.cph')
    .join({ loc: 'ahbrp.location' }, 'fi.feature_pk', 'loc.feature_pk')
    .join({ fs: 'ahbrp.feature_state' }, 'fi.feature_pk', 'fs.feature_pk')
    // @ts-expect-error unable to join properly, but still works
    .join(
      { rdc1: 'ahbrp.ref_data_code' },
      knex.raw('SUBSTR(??, 1, 6)', ['cph.cph']),
      '=',
      knex.ref('rdc1.code')
    )
    .join(
      { rdcm: 'ahbrp.ref_data_code_map' },
      'rdcm.to_ref_data_code_pk',
      'rdc1.ref_data_code_pk'
    )
    .join(
      { rdsm: 'ahbrp.ref_data_set_map' },
      'rdsm.ref_data_set_map_pk',
      'rdcm.ref_data_set_map_pk'
    )
    .join(
      { rdc: 'ahbrp.ref_data_code' },
      'rdcm.from_ref_data_code_pk',
      'rdc.ref_data_code_pk'
    )
    .join(
      { rdcd: 'ahbrp.ref_data_code_desc' },
      'rdc.ref_data_code_pk',
      'rdcd.ref_data_code_pk'
    )
    // WHERE clauses
    .where('fi.feature_involvement_type', 'CPHHOLDERSHIP')
    .whereNull('fi.feature_involv_to_date')
    .where('fs.feature_status_code', '<>', 'INACTIVE')
    .where('rdsm.ref_data_set_map_name', 'LOCAL_AUTHORITY_COUNTY_PARISH')
    .whereRaw("rdsm.effective_to_date = DATE '9999-12-31'")
    .whereRaw("rdcm.effective_to_date = DATE '9999-12-31'")
    .whereRaw("rdc.effective_to_date = DATE '9999-12-31'")
    .whereRaw("rdc1.effective_to_date = DATE '9999-12-31'")
    .where('cph.cph', cph)

    // SELECT (camelCase aliases; Knex will quote them for Oracle)
    .select({
      cph: 'cph.cph',
      cphType: 'cph.cph_type',
      locationId: 'loc.location_id',
      laName: 'rdcd.short_description',
      laNumber: 'rdc.code'
    })
    .select(knex.raw(`'Y' as "cphActive"`))
    .distinct()

  const { sql, bindings } = qb.toSQL()
  return { sql, bindings }
}

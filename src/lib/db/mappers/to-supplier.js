import { mask } from '../../pii/index.js'
import { asNullableString } from './as-nullable-string.js'

/**
 * A supplier party as the alpha supplier search returns it: both name sets,
 * the inapplicable one null. A sole-trader practice's organisation name can be
 * a person's name, so it is masked like the person names; the title is not.
 *
 * @param {Record<string, unknown>} row
 */
export const toSupplier = (row) => ({
  id: asNullableString(row.party_id),
  partyType: asNullableString(row.party_type),
  title: asNullableString(row.person_title),
  firstName: mask(asNullableString(row.person_given_name)),
  lastName: mask(asNullableString(row.person_family_name)),
  organisationName: mask(asNullableString(row.organisation_name))
})

import { mask } from '../../pii/index.js'
import { asNullableString } from './as-nullable-string.js'

/**
 * A supplier party in the shape of the alpha supplier search: both name sets,
 * the inapplicable one null. The title is masked like the names, and so is the
 * organisation name, as a sole-trader practice's can be a person's name.
 *
 * @param {Record<string, unknown>} row
 */
export const toSupplier = (row) => ({
  id: asNullableString(row.party_id),
  partyType: asNullableString(row.party_type),
  title: mask(asNullableString(row.person_title)),
  firstName: mask(asNullableString(row.person_given_name)),
  lastName: mask(asNullableString(row.person_family_name)),
  organisationName: mask(asNullableString(row.organisation_name))
})

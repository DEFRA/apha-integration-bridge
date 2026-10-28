import { asNullableDate } from './as-nullable-date.js'
import { asNullableString } from './as-nullable-string.js'

/**
 * @typedef {{
 *   mainRoleType: string | null,
 *   roleType: string | null,
 *   roleName: string | null,
 *   from: string | null
 * }} PartyRole
 */

/**
 * @param {Record<string, unknown>} row find-party-roles.sql row
 * @returns {PartyRole}
 */
export const toPartyRole = (row) => {
  return {
    mainRoleType: asNullableString(row.main_role_type),
    roleType: asNullableString(row.role_type),
    roleName: asNullableString(row.role_name),
    from: asNullableDate(row.party_role_from_date)
  }
}

/**
 * @param {Record<string, unknown>[]} rows find-party-roles.sql rows
 * @returns {PartyRole[]}
 */
export const toPartyRoles = (rows) => {
  const roles = []

  for (const row of rows) {
    roles.push(toPartyRole(row))
  }

  return roles
}

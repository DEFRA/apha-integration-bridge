import Joi from 'joi'

import { mask } from '../../pii/index.js'
import { asNullableString } from '../mappers/as-nullable-string.js'
import { execute } from '../operations/execute.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

/**
 * Supplier role types this query accepts. Each value is a SAM
 * ROLE.ROLE_TYPE literal that sits under MAIN_ROLE_TYPE = 'SUPPLIER'.
 * Adding a supplier type is an entry here, not a new query.
 */
export const SUPPLIER_TYPES = ['OVPRACTICE']

/**
 * A name fragment matched with "contains" against given name, family name
 * and organisation name. Oracle LIKE wildcards are rejected so a caller
 * cannot widen the match beyond the literal text. Organisation names carry
 * digits and punctuation, so anything else is allowed through.
 */
const NameSchema = Joi.string()
  .trim()
  .min(1)
  .max(100)
  .pattern(/^[^%_]+$/, 'no LIKE wildcards')

export const FindSuppliersSchema = Joi.object({
  type: Joi.string()
    .valid(...SUPPLIER_TYPES)
    .required()
    .description('Supplier role type'),
  name: NameSchema.description(
    'Name contains (case-insensitive). Matches given name, family name or organisation name'
  ),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .description('The page number to retrieve'),
  pageSize: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .description('The number of items per page')
})

/**
 * @typedef {{
 *   type: string,
 *   name?: string,
 *   page?: number,
 *   pageSize?: number
 * }} FindSuppliersParams
 */

/**
 * @param {FindSuppliersParams} params
 * @returns {{ sql: string; bindings: Record<string, unknown>; pageSize: number }}
 */
export function findSuppliersQuery(params) {
  const { value, error } = FindSuppliersSchema.validate(params)

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const { type, name = null, page, pageSize } = value

  return {
    sql,
    bindings: {
      roleType: type,
      name,
      offsetRows: pageSize * (page - 1),
      // fetch one row beyond the page so the caller can tell whether a
      // further page exists without a separate COUNT(*)
      fetchRows: pageSize + 1
    },
    pageSize
  }
}

/**
 * @param {Record<string, unknown>} row
 */
export const toSupplier = (row) => ({
  id: asNullableString(row.party_id),
  partyType: asNullableString(row.party_type),
  title: asNullableString(row.person_title),
  firstName: mask(asNullableString(row.person_given_name)),
  lastName: mask(asNullableString(row.person_family_name)),
  organisationName: asNullableString(row.organisation_name)
})

/**
 * Executes the find suppliers query and maps database rows to resources.
 *
 * @param {import('oracledb').Connection} connection
 * @param {FindSuppliersParams} params
 * @returns {Promise<{ suppliers: ReturnType<typeof toSupplier>[]; hasMore: boolean }>}
 */
export async function findSuppliers(connection, params) {
  const query = findSuppliersQuery(params)

  const rows = await execute(connection, query)

  const hasMore = rows.length > query.pageSize

  const pageRows = hasMore ? rows.slice(0, query.pageSize) : rows

  return {
    suppliers: pageRows.map(toSupplier),
    hasMore
  }
}

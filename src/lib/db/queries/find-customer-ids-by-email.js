import Joi from 'joi'

import { execute } from '../operations/execute.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

const FindCustomerIdsByEmailSchema = Joi.object({
  email: Joi.string().trim().min(1).required().description('E-mail address'),
  surname: Joi.string().trim().min(1).description('Family name'),
  postcode: Joi.string().trim().min(1).description('Postcode')
})

/**
 * @typedef {{ email: string, surname?: string, postcode?: string }} CustomerEmailSearch
 */

/**
 * The value an e-mail address or surname is compared on: trimmed and upper
 * case. The SQL normalises SAM's value the same way.
 *
 * @param {string} value
 * @returns {string}
 */
const normalise = (value) => value.trim().toUpperCase()

/**
 * The value a postcode is compared on: upper case with no spaces. The SQL
 * normalises SAM's value the same way.
 *
 * @param {string} postcode
 * @returns {string}
 */
const normalisePostcode = (postcode) =>
  postcode.toUpperCase().replace(/\s/g, '')

/**
 * The ids of the active people who hold `email` as a current e-mail contact,
 * optionally narrowed to those with the family name `surname` and a current
 * address at `postcode`. Matching is exact after normalisation.
 *
 * @param {CustomerEmailSearch} search
 * @returns {{ sql: string; bindings: Record<string, unknown> }} The query and its bindings
 */
export function findCustomerIdsByEmailQuery(search) {
  const { value, error } = FindCustomerIdsByEmailSchema.validate(search)

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  return {
    sql,
    bindings: {
      email: normalise(value.email),
      surname: value.surname ? normalise(value.surname) : null,
      postcode: value.postcode ? normalisePostcode(value.postcode) : null
    }
  }
}

/**
 * Finds the ids of the customers matching an e-mail search, each once,
 * ordered by id.
 *
 * @param {import('oracledb').Connection} connection
 * @param {CustomerEmailSearch} search
 * @returns {Promise<string[]>}
 */
export async function findCustomerIdsByEmail(connection, search) {
  const rows = await execute(connection, findCustomerIdsByEmailQuery(search))

  return rows.map((row) => String(row.party_id))
}

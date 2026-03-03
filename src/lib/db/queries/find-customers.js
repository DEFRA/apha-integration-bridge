import Joi from 'joi'

import { toPeople } from '../mappers/to-people.js'
import { execute } from '../operations/execute.js'
import { query } from '../operations/query.js'
import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

const CUSTOMER_IDS_BIND_TOKEN = '__CUSTOMER_IDS__'

const CUSTOMER_TYPE_BIND_TOKEN = '__CUSTOMER_TYPE__'

const CUSTOMER_TYPES = ['PERSON', 'ORGANISATION']

export const FindCustomersSchema = Joi.object({
  ids: Joi.array()
    .items(Joi.string().trim().min(1).required())
    .min(1)
    .required()
    .description('Customer ids'),
  customerType: Joi.string()
    .valid(...CUSTOMER_TYPES)
    .required()
    .description('Party type to return')
})

/**
 * @param {string[]} ids
 * @param {'PERSON' | 'ORGANISATION'} customerType
 * @returns {{ sql: string; }} The query and its bindings
 */
export function findCustomersQuery(ids, customerType) {
  const { value, error } = FindCustomersSchema.validate({ ids, customerType })

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const { placeholders, bindings } = createInClauseBindings(value.ids)
  const sqlWithIds = sql.replace(CUSTOMER_IDS_BIND_TOKEN, placeholders)
  const sqlWithFilters = sqlWithIds.replaceAll(
    CUSTOMER_TYPE_BIND_TOKEN,
    ':customerType'
  )

  return {
    sql: query()
      .raw(sqlWithFilters, { ...bindings, customerType: value.customerType })
      .toString()
  }
}

/**
 * Executes the find customers query and maps database rows to API customer objects.
 *
 * @param {import('oracledb').Connection} connection
 * @param {string[]} ids
 * @param {'PERSON' | 'ORGANISATION'} customerType
 */
export async function findCustomers(connection, ids, customerType) {
  if (customerType === 'ORGANISATION') {
    throw new Error('ORGANISATION customer type is not implemented')
  }

  const query = findCustomersQuery(ids, customerType)

  const rows = await execute(connection, query)

  return toPeople(rows, ids)
}

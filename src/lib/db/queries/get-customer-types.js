import Joi from 'joi'

import { execute } from '../operations/execute.js'
import { query } from '../operations/query.js'
import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { loadSQL } from '../utils/load-sql.js'

const sql = loadSQL(import.meta.filename)

const CUSTOMER_IDS_BIND_TOKEN = '__CUSTOMER_IDS__'

const CUSTOMER_TYPES = ['PERSON', 'ORGANISATION']

const GetCustomerTypesSchema = Joi.array()
  .items(
    Joi.string()
      .regex(/^[A-Z0-9]+$/i)
      .min(1)
      .required()
  )
  .min(1)
  .required()

/**
 * @param {string[]} customerIds
 * @returns {{ sql: string }}
 */
export function getCustomerTypesQuery(customerIds) {
  const { value, error } = GetCustomerTypesSchema.validate(customerIds)

  if (error) {
    throw new Error(`Invalid parameters: ${error.message}`)
  }

  const { placeholders, bindings } = createInClauseBindings(value)
  const sqlWithCustomerIds = sql.replace(CUSTOMER_IDS_BIND_TOKEN, placeholders)

  return {
    sql: query()
      .raw(sqlWithCustomerIds, { ...bindings })
      .toQuery()
  }
}

/**
 * @param {import('oracledb').Connection} connection
 * @param {string[]} customerIds
 * @returns {Promise<Map<string, 'PERSON' | 'ORGANISATION'>>}
 */
export async function getCustomerTypes(connection, customerIds) {
  const queryToRun = getCustomerTypesQuery(customerIds)

  const rows = await execute(connection, queryToRun)

  const customerTypes = new Map()

  for (const row of rows) {
    if (
      typeof row.customer_id === 'string' &&
      CUSTOMER_TYPES.includes(row.customer_type)
    ) {
      customerTypes.set(row.customer_id, row.customer_type)
    }
  }

  return customerTypes
}

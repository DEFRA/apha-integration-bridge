import Joi from 'joi'

import { toCustomer } from '../mappers/to-customer.js'
import { toOrganisationDetails } from '../mappers/to-organisation-details.js'
import { toOrganisations } from '../mappers/to-organisations.js'
import { toPeople } from '../mappers/to-people.js'
import { execute } from '../operations/execute.js'
import { createInClauseBindings } from '../utils/create-in-clause-bindings.js'
import { loadSQL } from '../utils/load-sql.js'
import { findOrganisationAttributesQuery } from './find-organisation-attributes.js'
import { findPartyContactsQuery } from './find-party-contacts.js'
import { findPartyRolesQuery } from './find-party-roles.js'

const sql = loadSQL(import.meta.filename)

const CUSTOMER_IDS_BIND_TOKEN = '__CUSTOMER_IDS__'

const CUSTOMER_TYPE_BIND_TOKEN = '__CUSTOMER_TYPE__'

const CUSTOMER_TYPES = ['PERSON', 'ORGANISATION']

export const FindCustomersSchema = Joi.object({
  ids: Joi.array()
    .items(
      Joi.string()
        .regex(/^[A-Z0-9]+$/i)
        .min(1)
        .required()
    )
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
 * @returns {{ sql: string; bindings: Record<string, unknown> }} The query and its bindings
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
    sql: sqlWithFilters,
    bindings: { ...bindings, customerType: value.customerType }
  }
}

/**
 * @param {Record<string, unknown>[]} rows find-customers.sql rows
 * @returns {Map<string, number>} party id to party key
 */
const partyKeysByIdOf = (rows) => {
  /** @type {Map<string, number>} */
  const partyKeysById = new Map()

  for (const row of rows) {
    const partyId = String(row.party_id)

    if (!partyKeysById.has(partyId)) {
      partyKeysById.set(partyId, Number(row.party_pk))
    }
  }

  return partyKeysById
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {number | undefined} partyKey
 * @returns {Record<string, unknown>[]}
 */
const rowsOfParty = (rows, partyKey) => {
  const partyRows = []

  for (const row of rows) {
    if (Number(row.party_pk) === partyKey) {
      partyRows.push(row)
    }
  }

  return partyRows
}

/**
 * Finds customers or organisations by id, with their contacts and roles.
 *
 * @param {import('oracledb').Connection} connection
 * @param {string[]} ids
 * @param {'PERSON' | 'ORGANISATION'} customerType
 */
export async function findCustomers(connection, ids, customerType) {
  const query = findCustomersQuery(ids, customerType)

  const rows = await execute(connection, query)

  const partyKeysById = partyKeysByIdOf(rows)
  const partyKeys = Array.from(partyKeysById.values())

  if (partyKeys.length < 1) {
    return []
  }

  const contacts = await execute(connection, findPartyContactsQuery(partyKeys))
  const roles = await execute(connection, findPartyRolesQuery(partyKeys))

  if (customerType === 'ORGANISATION') {
    const organisationAttributes = await execute(
      connection,
      findOrganisationAttributesQuery(partyKeys)
    )

    const organisations = []

    for (const organisation of toOrganisations(rows, ids)) {
      const partyKey = partyKeysById.get(organisation.id)
      const [attributes] = rowsOfParty(organisationAttributes, partyKey)

      organisations.push(
        toOrganisationDetails(organisation, {
          contacts: rowsOfParty(contacts, partyKey),
          roles: rowsOfParty(roles, partyKey),
          attributes
        })
      )
    }

    return organisations
  }

  const customers = []

  for (const person of toPeople(rows, ids)) {
    const partyKey = partyKeysById.get(person.id)

    customers.push(
      toCustomer(person, {
        contacts: rowsOfParty(contacts, partyKey),
        roles: rowsOfParty(roles, partyKey)
      })
    )
  }

  return customers
}

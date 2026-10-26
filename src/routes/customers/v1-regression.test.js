import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { afterAll, beforeAll, expect, test } from '@jest/globals'

import { oracleDb } from '../../common/helpers/oracledb.js'
import { piiContextPlugin } from '../../common/helpers/pii-context.js'
import { registerSimpleAuthStrategy } from '../../common/helpers/test-helpers/simple-auth.js'
import route from './find.js'

// snapshot recorded before partyType, roles and fax entries were added
const FIXTURE_CUSTOMER_IDS = [
  'C123456',
  'C234567',
  'C2982001',
  'C2982003',
  'C2982004'
]

/** @type {import('@hapi/hapi').Server} */
let unmaskedServer

/** @type {import('@hapi/hapi').Server} */
let maskedServer

/**
 * Without the client-scopes plugin, the PII plugin masks every response.
 *
 * @param {boolean} masked whether to register the PII context plugin
 * @returns {Promise<import('@hapi/hapi').Server>}
 */
async function createServer(masked) {
  const server = Hapi.server({ port: 0 })

  const plugins = [{ plugin: hapiPino, options: { enabled: false } }, oracleDb]

  if (masked) {
    plugins.push(piiContextPlugin)
  }

  await server.register(plugins)

  registerSimpleAuthStrategy(server)

  server.route({ ...route, path: '/customers/find' })

  return server
}

/**
 * Contact order used to follow database row order, so compare sorted.
 *
 * @param {Record<string, any>} contactDetail
 * @returns {string}
 */
function sortKeyOf(contactDetail) {
  const value = contactDetail.emailAddress ?? contactDetail.phoneNumber

  return `${contactDetail.type}|${value}|${contactDetail.usageType}`
}

/**
 * Removes the fields added by this change.
 *
 * @param {Record<string, any>} customer
 */
function withoutAddedMembers(customer) {
  delete customer.partyType
  delete customer.roles

  const contactDetailsBefore = []

  for (const contactDetail of customer.contactDetails) {
    if (contactDetail.type !== 'fax') {
      contactDetailsBefore.push(contactDetail)
    }
  }

  contactDetailsBefore.sort((first, second) =>
    sortKeyOf(first).localeCompare(sortKeyOf(second))
  )

  customer.contactDetails = contactDetailsBefore

  return customer
}

/**
 * @param {import('@hapi/hapi').Server} server
 */
async function findFixtureCustomers(server) {
  const response = await server.inject({
    method: 'POST',
    url: '/customers/find?page=1&pageSize=10',
    payload: { ids: FIXTURE_CUSTOMER_IDS }
  })

  const result = /** @type {Record<string, any>} */ (response.result)

  for (const customer of result.data) {
    withoutAddedMembers(customer)
  }

  return { statusCode: response.statusCode, result }
}

beforeAll(async () => {
  unmaskedServer = await createServer(false)
  maskedServer = await createServer(true)
})

afterAll(async () => {
  await unmaskedServer.stop()
  await maskedServer.stop()
})

test('POST /customers/find is unchanged for the fixture customers apart from the added members', async () => {
  expect(await findFixtureCustomers(unmaskedServer)).toMatchSnapshot()
})

test('POST /customers/find is unchanged for a client without the pii scope apart from the added members', async () => {
  expect(await findFixtureCustomers(maskedServer)).toMatchSnapshot()
})

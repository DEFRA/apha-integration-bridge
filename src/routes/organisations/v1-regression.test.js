import Hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { afterAll, beforeAll, expect, test } from '@jest/globals'

import { oracleDb } from '../../common/helpers/oracledb.js'
import { piiContextPlugin } from '../../common/helpers/pii-context.js'
import { registerSimpleAuthStrategy } from '../../common/helpers/test-helpers/simple-auth.js'
import route from './find.js'

// snapshot recorded before organisationType, roles and contactMethods were added
const FIXTURE_ORGANISATION_IDS = [
  'O123456',
  'C2982002',
  'C2982006',
  'C2982007',
  'C2982008',
  'ACAR2930'
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

  server.route({ ...route, path: '/organisations/find' })

  return server
}

/**
 * Removes the fields added by this change.
 *
 * @param {Record<string, any>} organisation
 */
function withoutAddedMembers(organisation) {
  delete organisation.organisationType
  delete organisation.roles
  delete organisation.contactMethods

  return organisation
}

/**
 * @param {import('@hapi/hapi').Server} server
 */
async function findFixtureOrganisations(server) {
  const response = await server.inject({
    method: 'POST',
    url: '/organisations/find?page=1&pageSize=10',
    payload: { ids: FIXTURE_ORGANISATION_IDS }
  })

  const result = /** @type {Record<string, any>} */ (response.result)

  for (const organisation of result.data) {
    withoutAddedMembers(organisation)
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

test('POST /organisations/find is unchanged for the fixture organisations apart from the added members', async () => {
  expect(await findFixtureOrganisations(unmaskedServer)).toMatchSnapshot()
})

test('POST /organisations/find is unchanged for a client without the pii scope apart from the added members', async () => {
  expect(await findFixtureOrganisations(maskedServer)).toMatchSnapshot()
})

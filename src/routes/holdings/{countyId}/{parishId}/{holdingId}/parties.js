import Joi from 'joi'

import { loadDocumentation } from '../../../../../common/helpers/documentation.js'
import { metricsCounter } from '../../../../../common/helpers/metrics.js'
import {
  toHoldingInvolvements,
  toHoldingParties
} from '../../../../../lib/db/mappers/to-holding-parties.js'
import { execute } from '../../../../../lib/db/operations/execute.js'
import { findCustomersQuery } from '../../../../../lib/db/queries/find-customers.js'
import { findHoldingsQuery } from '../../../../../lib/db/queries/find-holdings.js'
import { findOrganisationAttributesQuery } from '../../../../../lib/db/queries/find-organisation-attributes.js'
import { findPartyAddressesQuery } from '../../../../../lib/db/queries/find-party-addresses.js'
import { findPartyContactsQuery } from '../../../../../lib/db/queries/find-party-contacts.js'
import { findPartyInvolvementsQuery } from '../../../../../lib/db/queries/find-party-involvements.js'
import { findPartyRolesQuery } from '../../../../../lib/db/queries/find-party-roles.js'
import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../../../../lib/http/http-exception.js'
import { SelfLinkSchema } from '../../../../../types/find/links.js'
import { Party } from '../../../../../types/parties.js'
import { FindHoldingRequestParametersSchema } from '../{holdingId}.js'

const GetHoldingPartiesResponseSchema = Joi.object({
  data: Joi.array().items(Party).required(),
  links: SelfLinkSchema
})
  .description(
    "Everyone involved with the CPH's active holderships, each party once"
  )
  .label('Holding Parties Response')

const __dirname = new URL('.', import.meta.url).pathname

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'holdings'],
  description:
    'Retrieve the holders, land owners and keepers involved with a CPH',
  notes: loadDocumentation(__dirname, 'parties.md'),
  plugins: {
    'hapi-swagger': {
      id: 'holding-parties',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    params: FindHoldingRequestParametersSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning')
    }).options({ allowUnknown: true }),
    failAction: HTTPException.failValidation
  },
  response: {
    status: {
      200: GetHoldingPartiesResponseSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

/**
 * @param {unknown[]} values
 */
const distinct = (values) => [...new Set(values)]

/**
 * @param {import('../../../../../types/api.js').ControllerRequest} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').Lifecycle.ReturnValue>}
 */
export async function handler(request, h) {
  if (request.pre.apiVersion > 1.0) {
    return new HTTPException(
      'UNSUPPORTED_VERSION',
      `Unknown version: ${request.pre.apiVersion}`
    ).boomify()
  }

  try {
    await metricsCounter('holdingPartiesRequest')

    await using oracledb = await request.server['oracledb.sam']()

    /**
     * runs one of the route's batch queries for a set of keys, counted so the
     * performance test sees every round trip; an empty set needs no query
     *
     * @param {string} name
     * @param {any[]} keys
     * @param {(keys: any[]) => { sql: string; bindings: Record<string, unknown> }} toQuery
     */
    const runFor = async (name, keys, toQuery) => {
      if (keys.length < 1) {
        return []
      }

      await metricsCounter('holdingPartiesQuery', 1, { query: name })

      return execute(oracledb.connection, toQuery(keys))
    }

    const { countyId, parishId, holdingId } = request.params

    const cph = `${countyId}/${parishId}/${holdingId}`

    const holderships = await runFor('holderships', [cph], findHoldingsQuery)

    if (holderships.length < 1) {
      throw new HTTPException('NOT_FOUND', 'Holding not found or inactive')
    }

    const involvements = toHoldingInvolvements(
      holderships,
      await runFor(
        'involvements',
        distinct(holderships.map((row) => row.feature_pk)),
        findPartyInvolvementsQuery
      )
    )

    /**
     * @param {string} partyType
     * @param {string} column
     */
    const keysOf = (partyType, column) =>
      distinct(
        involvements
          .filter((row) => row.party_type === partyType)
          .map((row) => row[column])
      )

    const partyKeys = distinct(involvements.map((row) => row.party_pk))

    const data = toHoldingParties({
      holderships,
      involvements,
      roles: await runFor('roles', partyKeys, findPartyRolesQuery),
      contacts: await runFor('contacts', partyKeys, findPartyContactsQuery),
      addresses: await runFor('addresses', partyKeys, findPartyAddressesQuery),
      people: await runFor('people', keysOf('PERSON', 'party_id'), (ids) =>
        findCustomersQuery(ids, 'PERSON')
      ),
      organisations: await runFor(
        'organisations',
        keysOf('ORGANISATION', 'party_id'),
        (ids) => findCustomersQuery(ids, 'ORGANISATION')
      ),
      organisationAttributes: await runFor(
        'organisationAttributes',
        keysOf('ORGANISATION', 'party_pk'),
        findOrganisationAttributesQuery
      )
    })

    request.logger.debug(`Retrieved ${data.length} party(s) for CPH ${cph}`)

    return h.response({ data, links: { self: request.path } }).code(200)
  } catch (error) {
    request.logger.error(error)

    let httpException = error

    if (!(httpException instanceof HTTPException)) {
      httpException = new HTTPException(
        'INTERNAL_SERVER_ERROR',
        'An error occurred while processing your request',
        [new HTTPError('DATABASE_ERROR', 'Failed to execute database query')]
      )
    }

    return httpException.boomify()
  }
}

export default {
  method: 'GET',
  handler,
  options
}

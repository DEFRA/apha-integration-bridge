import Joi from 'joi'

import { loadDocumentation } from '../../../../../common/helpers/documentation.js'
import { metricsCounter } from '../../../../../common/helpers/metrics.js'
import { toHoldingSuppliers } from '../../../../../lib/db/mappers/to-holding-suppliers.js'
import { execute } from '../../../../../lib/db/operations/execute.js'
import { findHoldingsQuery } from '../../../../../lib/db/queries/find-holdings.js'
import { findSupplierInvolvementsQuery } from '../../../../../lib/db/queries/find-supplier-involvements.js'
import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../../../../lib/http/http-exception.js'
import { SelfLinkSchema } from '../../../../../types/find/links.js'
import { HoldingSupplier } from '../../../../../types/holding-suppliers.js'
import { FindHoldingRequestParametersSchema } from '../{holdingId}.js'

const GetHoldingSuppliersResponseSchema = Joi.object({
  data: Joi.array().items(HoldingSupplier).required(),
  links: SelfLinkSchema
})
  .description(
    'The Official Veterinarian practice and Delivery Partner of each livestock unit at the locations of the CPH, each supplier once'
  )
  .label('Holding Suppliers Response')

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
    'Retrieve the vet practice and delivery partner for each livestock unit of a CPH',
  notes: loadDocumentation(__dirname, 'suppliers.md'),
  plugins: {
    'hapi-swagger': {
      id: 'holding-suppliers',
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
      200: GetHoldingSuppliersResponseSchema,
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
    await metricsCounter('holdingSuppliersRequest')

    await using oracledb = await request.server['oracledb.sam']()

    /**
     * runs one of the route's batch queries for a set of keys, counted so the
     * performance test sees every round trip
     *
     * @param {string} name
     * @param {any[]} keys
     * @param {(keys: any[]) => { sql: string; bindings: Record<string, unknown> }} toQuery
     */
    const runFor = async (name, keys, toQuery) => {
      await metricsCounter('holdingSuppliersQuery', 1, { query: name })

      return execute(oracledb.connection, toQuery(keys))
    }

    const { countyId, parishId, holdingId } = request.params

    const cph = `${countyId}/${parishId}/${holdingId}`

    const holderships = await runFor('holderships', [cph], findHoldingsQuery)

    if (holderships.length < 1) {
      throw new HTTPException('NOT_FOUND', 'Holding not found or inactive')
    }

    const data = toHoldingSuppliers(
      await runFor(
        'involvements',
        distinct(holderships.map((row) => row.feature_pk)),
        findSupplierInvolvementsQuery
      )
    )

    request.logger.debug(`Retrieved ${data.length} supplier(s) for CPH ${cph}`)

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

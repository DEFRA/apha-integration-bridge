import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'
import retry from 'async-retry'

import {
  HTTPExceptionSchema,
  HTTPException,
  HTTPError
} from '../../../lib/http/http-exception.js'
import { HTTPObjectResponse } from '../../../lib/http/http-response.js'
import { salesforceClient } from '../../../lib/salesforce/client.js'
import { getUserEmail } from '../../../common/helpers/user-context.js'
import {
  GetCaseParamsSchema,
  GetCaseResponseSchema
} from '../../../types/case-management/case.js'

/**
 * @import {Request} from '@hapi/hapi'
 */

const __dirname = new URL('.', import.meta.url).pathname
const retriesConfig = {
  retries: 3,
  maxRetryTime: 10000,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 4000
}

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: 'simple',
  tags: ['api', 'case-management'],
  description: 'Get a case by ID from APHA CRM (Salesforce)',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), '{caseId}.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'case-management-case-get',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    params: GetCaseParamsSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning')
    }).options({ allowUnknown: true }),
    failAction: (request, h, error) =>
      HTTPException.failValidation(request, h, error)
  },
  response: {
    status: {
      200: GetCaseResponseSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

/**
 * @type {import('@hapi/hapi').Lifecycle.Method}
 */
async function handler(request, h) {
  const { caseId } = /** @type {{ caseId: string }} */ (request.params)

  try {
    // Extract authenticated user's email for user-level authentication
    const userEmail = getUserEmail(request)

    const query = buildCaseQuery(caseId)

    const result = await retry(async () => {
      // Use user-level authentication if user is authenticated, otherwise fall back to system-level
      return await salesforceClient.sendQuery(query, request.logger, userEmail)
    }, retriesConfig)

    if (!result.records || result.records.length === 0) {
      return new HTTPException('NOT_FOUND', 'Case not found', [
        new HTTPError('CASE_NOT_FOUND', `Case with ID ${caseId} was not found`)
      ]).boomify()
    }

    const caseRecord = result.records[0]

    // Build response - HTTPObjectResponse spreads data along with type and id
    const response = new HTTPObjectResponse('case', caseRecord.Id, {
      attributes: {
        caseNumber: caseRecord.CaseNumber,
        status: caseRecord.Status,
        priority: caseRecord.Priority,
        contactId: caseRecord.ContactId,
        createdDate: caseRecord.CreatedDate,
        lastModifiedDate: caseRecord.LastModifiedDate
      }
    })

    response.links({ self: request.path })

    request.logger?.info(
      {
        caseId,
        userEmail: userEmail || 'system',
        authContext: userEmail ? 'user-level' : 'system-level'
      },
      'Successfully retrieved case'
    )

    return h.response(response.toResponse()).code(200)
  } catch (error) {
    request.logger?.error(
      {
        err: error,
        caseId,
        endpoint: 'case-management/case/{caseId}'
      },
      'Failed to retrieve case from Salesforce'
    )

    return new HTTPException(
      'INTERNAL_SERVER_ERROR',
      'Your request could not be processed',
      [
        new HTTPError(
          'DATABASE_ERROR',
          'Cannot retrieve case from the case management service'
        )
      ]
    ).boomify()
  }
}

/**
 * Build SOQL query to retrieve case by ID
 * @param {string} caseId
 * @returns {string}
 */
function buildCaseQuery(caseId) {
  const escapedCaseId = caseId.replace(/'/g, "\\'")

  return `
    SELECT
      Id,
      CaseNumber,
      Status,
      Priority,
      ContactId,
      CreatedDate,
      LastModifiedDate
    FROM Case
    WHERE Id = '${escapedCaseId}'
    LIMIT 1
  `.trim()
}

export default {
  method: 'GET',
  path: '/case-management/case/{caseId}',
  handler,
  options
}

import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  HTTPExceptionSchema,
  HTTPException
} from '../../../lib/http/http-exception.js'

import { scenarios } from './activity.mocks.js'

const __dirname = new URL('.', import.meta.url).pathname

/**
 * Presence rule for the fields that are mandatory only when the activity is
 * being resolved as completed, and optional otherwise (e.g. when it is
 * Resolved-Not-Required). The `is` schema is an explicit `.required()` so the
 * branch is taken only when `activityclosingreason` is persent and exactly
 * equals 'Resolved-Completed' — an absent or different value falls through to
 * the optional base rule. Formats are not validated, only presence.
 */
const requiredWhenCompleted = {
  is: Joi.valid('Resolved-Completed').required(),
  then: Joi.required()
}

const StandardWorkSchema = Joi.object({
  workscheduleid: Joi.string()
    .required()
    .description('Sam Work Schedule identifier, e.g. WS-12345'),
  workscheduleactivityid: Joi.string()
    .required()
    .description(
      'Sam Work Schedule Activity identifier, a child of the work schedule, e.g. WSA-100023'
    ),
  activityclosingreason: Joi.string()
    .required()
    .description(
      "Resolution state: 'Resolved-Completed' or 'Resolved-Not-Required'"
    ),
  businessresource: Joi.string()
    .required()
    .description('Email address of the business user making this data update'),
  activityscheduleddate: Joi.string().description(
    'Date the work was scheduled for, e.g. 2025-09-18T12:00:00Z (always optional)'
  ),
  resourcecompletingactivity: Joi.string()
    .when('activityclosingreason', requiredWhenCompleted)
    .description(
      "Email address of the Sam operator who performed the task (mandatory when activityclosingreason is 'Resolved-Completed')"
    ),
  activityactualstartdate: Joi.string()
    .when('activityclosingreason', requiredWhenCompleted)
    .description(
      "Activity actual start date (mandatory when activityclosingreason is 'Resolved-Completed')"
    ),
  activitycompletiondate: Joi.string()
    .when('activityclosingreason', requiredWhenCompleted)
    .description(
      "Activity completion date (mandatory when activityclosingreason is 'Resolved-Completed')"
    )
})
  .description(
    'A standard work update; presence is validated (including the fields that are conditionally mandatory on activityclosingreason), formats are not'
  )
  .label('Standard Work Update')

const SamResponseSchema = Joi.object({
  code: Joi.string()
    .required()
    .description("Standardised response code 'sam-api-success'"),
  uid: Joi.string()
    .required()
    .description('Unique identifier associated with the response'),
  message: Joi.string()
    .required()
    .description('Detailed description of the success of the request')
})
  .description('A success response from the Sam standardwork API')
  .label('Sam Response')

const SamErrorSchema = Joi.object({
  code: Joi.string()
    .required()
    .description("Standardised response code 'sam-api-error-' plus cause"),
  message: Joi.string().required().description('Detail of the error'),
  uid: Joi.string()
    .required()
    .description('Unique identifier associated with the response'),
  field_errors: Joi.array()
    .items(
      Joi.object({
        code: Joi.string().required().description('Standardised error code'),
        message: Joi.string()
          .required()
          .description('Human-readable error message')
      }).label('Sam Field Error')
    )
    .description('Field validation errors')
})
  .description('An error response from the Sam standardwork API')
  .label('Sam Error')

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
export const options = {
  auth: false,
  tags: ['api', 'workorders'],
  description:
    'Update and resolve a work schedule activity (mock of the Sam standardwork API)',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), 'activity.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'workorders-activity',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning'),
      'Content-Type': Joi.string().allow('application/json'),
      'x-test-scenario': Joi.string()
        .valid(...Object.keys(scenarios))
        .default('success')
        .description('Selects the canned Sam response to return')
    }).options({ allowUnknown: true }),
    payload: StandardWorkSchema,
    failAction: HTTPException.failValidation
  },
  response: {
    status: {
      200: SamResponseSchema,
      403: SamErrorSchema,
      405: SamErrorSchema,
      409: SamErrorSchema,
      '400-500': Joi.alternatives()
        .try(SamErrorSchema, HTTPExceptionSchema)
        .label('Sam Error or HTTP Exception')
    }
  }
}

/**
 * @param {import('../../../types/api.js').ControllerRequest} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {Promise<import('@hapi/hapi').Lifecycle.ReturnValue>}
 */
export async function handler(request, h) {
  /**
   * only supported API version is 1.0
   */
  if (request.pre.apiVersion > 1.0) {
    return new HTTPException(
      'UNSUPPORTED_VERSION',
      `Unknown version: ${request.pre.apiVersion}`
    ).boomify()
  }

  /**
   * the header is a validated enum defaulting to 'success', so a scenario
   * is always found
   */
  const { statusCode, response } = scenarios[request.headers['x-test-scenario']]

  return h.response(response).code(statusCode)
}

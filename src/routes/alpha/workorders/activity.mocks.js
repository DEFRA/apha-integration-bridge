/**
 * Canned responses for the mock Sam standardwork API, keyed by the
 * `x-test-scenario` request header value. Bodies are verbatim from the
 * response examples in StandardWorkAPI-openapi.yaml (v1.0.1), including
 * the fixed `uid` and the original spacing/typos.
 */
const uid = '08d94217-8a85-4962-921b-6c42241b9d3d'

export const scenarios = {
  success: {
    statusCode: 200,
    response: {
      code: 'sam-api-success',
      uid,
      message: 'Work schedule activity WSA-12345 updated'
    }
  },
  'sam-api-error-validation': {
    statusCode: 400,
    response: {
      code: 'sam-api-error-validation',
      uid,
      message: 'One or more fields are invalid',
      field_errors: [
        {
          code: 'sam-api-error-invalid-format',
          message: "workscheduleid must be of the format: '^WS-[0-9]{1,20}$'"
        },
        {
          code: 'sam-api-error-invalid-format',
          message:
            "workscheduleactivityid must be of the format: '^WSA-[0-9]{1,20}$'"
        },
        {
          code: 'sam-api-error-invalid-format',
          message:
            'activityscheduleddate must be of the format: YYYY-MM-DDTHH:MM:SSZ'
        },
        {
          code: 'sam-api-error-invalid-format',
          message:
            "activityclosingreason must be either 'Resolved-Completed' or 'Resolved-Not-Required'"
        },
        {
          code: 'sam-api-error-invalid-format',
          message: 'resourcecompletingactivity must be a valid email address'
        },
        {
          code: 'sam-api-error-invalid-format',
          message: 'businessresource must be a valid email address'
        },
        {
          code: 'sam-api-error-invalid-format',
          message:
            'activityactualstartdate must be of the format: YYYY-MM-DDTHH:MM:SSZ'
        },
        {
          code: 'sam-api-error-invalid-format',
          message:
            'activitycompletiondate must be of the format: YYYY-MM-DDTHH:MM:SSZ'
        }
      ]
    }
  },
  'sam-api-error-ws-not-found': {
    statusCode: 400,
    response: {
      code: 'sam-api-error-ws-not-found',
      uid,
      message: 'Work Schedule WS-12345 was not found'
    }
  },
  'sam-api-error-ws-activity-not-found': {
    statusCode: 400,
    response: {
      code: 'sam-api-error-ws-activity-not-found',
      uid,
      message: 'Work Schedule Activity WSA-99999 was not found'
    }
  },
  'sam-api-error-ws-wsa-invalid-combination': {
    statusCode: 400,
    response: {
      code: 'sam-api-error-ws-wsa-invalid-combination',
      uid,
      message:
        'Work Schedule WS-12345 and Work Schedule Activity WSA-99999 are not a valid combination'
    }
  },
  'sam-api-error-resource-invalid': {
    statusCode: 400,
    response: {
      code: 'sam-api-error-resource-invalid',
      uid,
      message:
        'Resource forname.surname@apha.gov.uk either not found, or is not valid for use'
    }
  },
  'sam-api-error-unexpected-error': {
    statusCode: 400,
    response: {
      code: 'sam-api-error-unexpected-error',
      uid,
      message: 'An unexpected error has occurred'
    }
  },
  'sam-api-error-ws-closed': {
    statusCode: 403,
    response: {
      code: 'sam-api-error-ws-closed',
      uid,
      message:
        'Parent work schedule WS-12345 is Resolved.  Work Schedule Activity WSA-99999 cannot be updated.'
    }
  },
  'sam-api-error-invalid-class-type': {
    statusCode: 405,
    response: {
      code: 'sam-api-error-invalid-class-type',
      uid,
      message:
        'The class type referenced by WSA-99999 cannot be updated by this API.  AH-AC-Activity-Standard, and AH-AC-Activity-NDSampling only are supported'
    }
  },
  'sam-api-error-wsa-locked': {
    statusCode: 409,
    response: {
      code: 'sam-api-error-wsa-locked',
      uid,
      message:
        'Work Schedule Activity WSA-99999 is locked and cannot be updated currently'
    }
  }
}

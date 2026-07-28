Update (and resolve) a work schedule activity in SAM. The bridge authenticates to the SAM standardwork API with its own EntraID token and forwards the update; The API's own response is returned to you unchanged. This is the live integration — for canned test responses use the mock endpoint `PATCH /alpha/workorders/activity` instead, which is unauthenticated and never performs a real write.

## Authentication

Requests must carry a valid bearer token **and** the calling client must hold the `write` scope (granted per client id in `clients.jsonc`). The scope is checked immediately after authentication and before the payload is validated, so a client without it receives `401` whatever its (well-formed) body contains — it cannot use validation errors to probe the schema:

```json
{
  "message": "Missing write scope",
  "code": "UNAUTHORIZED",
  "errors": []
}
```

A malformed JSON body is still rejected with `400` before the scope check, because the framework parses the payload first.

## Request payload

Presence is validated, formats are not — SAM itself validates formats and reports them as field errors. Which properties are mandatory depends on `activityclosingreason`.

Always mandatory:

| Property                 | Description                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `workscheduleid`         | SAM Work Schedule identifier, e.g. `WS-12345`                                           |
| `workscheduleactivityid` | SAM Work Schedule Activity identifier (a child of the work schedule), e.g. `WSA-100023` |
| `activityclosingreason`  | Resolution state: `Resolved-Completed` or `Resolved-Not-Required`                       |
| `businessresource`       | Email address of the business user making this data update                              |

Mandatory when `activityclosingreason` is `Resolved-Completed`, otherwise optional (e.g. when it is `Resolved-Not-Required`):

| Property                     | Description                                              |
| ---------------------------- | -------------------------------------------------------- |
| `resourcecompletingactivity` | Email address of the SAM operator who performed the task |
| `activityactualstartdate`    | Activity actual start date/time                          |
| `activitycompletiondate`     | Completion date/time                                     |

Always optional:

| Property                | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| `activityscheduleddate` | Date the work was scheduled for, e.g. `2025-09-18T12:00:00Z` |

Properties not listed above are rejected with a validation error.

## Success response

SAM's success body is returned with its own status code:

```json
{
  "code": "sam-api-success",
  "uid": "08d94217-8a85-4962-921b-6c42241b9d3d",
  "message": "Work schedule activity WSA-12345 updated"
}
```

## Two response shapes

Responses come from one of two places, and they do **not** share a shape. Clients must handle both:

| Origin                   | Shape                                   | When                                                                      |
| ------------------------ | --------------------------------------- | ------------------------------------------------------------------------- |
| **SAM**, passed through  | `{ code, uid, message, field_errors? }` | SAM accepted the update, or rejected it with a recognised `sam-api-` code |
| **The bridge**, envelope | `{ message, code, errors }`             | The bridge rejected the request, or could not complete it (`400`–`503`)   |

Both can carry a `400`: a missing mandatory property produces the bridge envelope, whereas `sam-api-error-ws-not-found` produces the SAM body. Pass-through is semantically verbatim — the body is parsed and re-serialised, so key order and whitespace are not byte-preserved.

## SAM responses (passed through)

SAM bodies are forwarded with SAM's status code, unmodified:

| Code                                       | Status | Meaning                                              |
| ------------------------------------------ | ------ | ---------------------------------------------------- |
| `sam-api-success`                          | 200    | The activity was updated                             |
| `sam-api-error-validation`                 | 400    | One or more fields invalid (carries `field_errors`)  |
| `sam-api-error-ws-not-found`               | 400    | The work schedule does not exist                     |
| `sam-api-error-ws-activity-not-found`      | 400    | The work schedule activity does not exist            |
| `sam-api-error-ws-wsa-invalid-combination` | 400    | Schedule and activity are not a valid pairing        |
| `sam-api-error-resource-invalid`           | 400    | An email address is not a usable SAM resource        |
| `sam-api-error-unexpected-error`           | 400    | Unexpected failure inside SAM                        |
| `sam-api-error-ws-closed`                  | 403    | The parent work schedule is already resolved         |
| `sam-api-error-invalid-class-type`         | 405    | The activity's class type is not updatable by an API |
| `sam-api-error-wsa-locked`                 | 409    | The activity is locked and cannot be updated now     |

Where a body includes `field_errors`, it is an **array** of `{ code, message }` entries. The field-level codes `sam-api-error-invalid-format` and `sam-api-error-mandatory-field-absent` only ever appear inside it.

Only recognisable SAM business responses are passed through: a JSON body with a `2xx` status, or a `4xx` (other than `401`) whose `code` begins `sam-api-`. Anything else — a gateway error page, a `5xx`, a rejected bearer token — becomes a `502` (below) so that upstream internals are never forwarded.

## Bridge responses (envelope)

```json
{
  "message": "Invalid request parameters",
  "code": "BAD_REQUEST",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "\"workscheduleid\" is required"
    }
  ]
}
```

| Status | `code`                | Cause                                                                                                      |
| ------ | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| 400    | `BAD_REQUEST`         | Missing mandatory property, unknown property, or an absent/malformed body                                  |
| 401    | `UNAUTHORIZED`        | No/invalid bearer token, or the client lacks the `write` scope                                             |
| 404    | `UNSUPPORTED_VERSION` | An `accept` header requesting an API version other than 1                                                  |
| 502    | `BAD_GATEWAY`         | SAM unreachable, timed out, redirected, returned a non-JSON or unrecognised body, or rejected our token    |
| 503    | `SERVICE_UNAVAILABLE` | The SAM integration is not configured (`SAM_API_BASE_URL` unset) — fails closed rather than faking a write |

A `502` means the update's fate is unknown — the bridge does not retry it, because SAM may already have applied it. The one exception is a rejected bearer token: that is refused before SAM processes anything, so the bridge silently re-authenticates and replays the request once.

The mock endpoint's `x-test-scenario` header has no meaning here: it is neither validated nor read, so sending it (with any value) changes nothing.

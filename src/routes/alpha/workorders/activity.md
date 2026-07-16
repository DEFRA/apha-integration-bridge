Update (and resolve) a work schedule activity in Sam. This alpha endpoint stands in for the live Sam integration while it is under development: nothing is stored or forwarded, and the response is selected by the `x-test-scenario` request header.

## Request payload

Presence is validated, formats are not (format validation belongs to the live Sam integration). Which properties are mandatory depends on `activityclosingreason`.

Always mandatory:

| Property                 | Description                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `workscheduleid`         | Sam Work Schedule identifier, e.g. `WS-12345`                                           |
| `workscheduleactivityid` | Sam Work Schedule Activity identifier (a child of the work schedule), e.g. `WSA-100023` |
| `activityclosingreason`  | Resolution state: `Resolved-Completed` or `Resolved-Not-Required`                       |
| `businessresource`       | Email address of the business user making this data update                              |

Mandatory when `activityclosingreason` is `Resolved-Completed`, otherwise optional (e.g. when it is `Resolved-Not-Required`):

| Property                     | Description                                              |
| ---------------------------- | -------------------------------------------------------- |
| `resourcecompletingactivity` | Email address of the Sam operator who performed the task |
| `activityactualstartdate`    | Activity actual start date/time                          |
| `activitycompletiondate`     | Activity completion date/time                            |

Always optional:

| Property                | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| `activityscheduleddate` | Date the work was scheduled for, e.g. `2025-09-18T12:00:00Z` |

Properties not listed above are rejected with a validation error.

## Choosing a response with `x-test-scenario`

Omit the header (or send `success`) to receive the success response. Send any of the `sam-api-error-*` values below to receive that error response verbatim. Any other value is rejected with a 400 validation error in the bridge envelope.

| `x-test-scenario`                             | Status | Response body                                    |
| --------------------------------------------- | ------ | ------------------------------------------------ |
| `success` (default when the header is absent) | 200    | `sam-api-success`                                |
| `sam-api-error-validation`                    | 400    | `sam-api-error-validation` (with `field_errors`) |
| `sam-api-error-ws-not-found`                  | 400    | `sam-api-error-ws-not-found`                     |
| `sam-api-error-ws-activity-not-found`         | 400    | `sam-api-error-ws-activity-not-found`            |
| `sam-api-error-ws-wsa-invalid-combination`    | 400    | `sam-api-error-ws-wsa-invalid-combination`       |
| `sam-api-error-resource-invalid`              | 400    | `sam-api-error-resource-invalid`                 |
| `sam-api-error-unexpected-error`              | 400    | `sam-api-error-unexpected-error`                 |
| `sam-api-error-ws-closed`                     | 403    | `sam-api-error-ws-closed`                        |
| `sam-api-error-invalid-class-type`            | 405    | `sam-api-error-invalid-class-type`               |
| `sam-api-error-wsa-locked`                    | 409    | `sam-api-error-wsa-locked`                       |

The field-level codes `sam-api-error-invalid-format` and `sam-api-error-mandatory-field-absent` are not scenarios — they only appear inside the `field_errors` of the `sam-api-error-validation` response body.

## Success response

With all mandatory properties present and `x-test-scenario` absent or `success`, the endpoint returns `200` with the Sam success body:

```json
{
  "code": "sam-api-success",
  "uid": "08d94217-8a85-4962-921b-6c42241b9d3d",
  "message": "Work schedule activity WSA-12345 updated"
}
```

## Error responses

Sam error scenarios are returned unwrapped, with the status code shown in the table above. For example `x-test-scenario: sam-api-error-ws-closed` returns `403` with:

```json
{
  "code": "sam-api-error-ws-closed",
  "uid": "08d94217-8a85-4962-921b-6c42241b9d3d",
  "message": "Parent work schedule WS-12345 is Resolved.  Work Schedule Activity WSA-99999 cannot be updated."
}
```

Where an error body includes `field_errors`, it is an **array** of `{ code, message }` entries (see the `sam-api-error-validation` scenario).

If the request itself is invalid — a mandatory property is missing (including the conditional properties above when `activityclosingreason` is `Resolved-Completed`), an unknown property is sent, an unknown `x-test-scenario` value is used, or the body is absent or not valid JSON — the bridge's standard error envelope is returned instead:

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

# GET /case-management/case/{caseId}

Use this endpoint to fetch current details for a single case.

## What this endpoint does

- Retrieves one case by ID.
- Returns case attributes such as `status`, `priority`, and `timestamps`.
- Requires user-context information via forwarded auth header.

## Authentication and headers

- `X-Forwarded-Authorization: Bearer <user-jwt>` is required by endpoint logic.
- `Accept: application/vnd.apha.1+json` is supported.
- `Authorization: Bearer <service-token>` may also be required by your API gateway/environment.

The forwarded user token must include an email claim so user context can be resolved.

## Path parameter

| Parameter | Type   | Required | Rules                                           |
| --------- | ------ | -------- | ----------------------------------------------- |
| `caseId`  | string | Yes      | Case identifier (for example `500ABC123456789`) |

Example:

```bash
curl -X GET \
  'https://<host>/case-management/case/500ABC123456789' \
  -H 'Authorization: Bearer <service-token>' \
  -H 'X-Forwarded-Authorization: Bearer <user-jwt>' \
  -H 'Accept: application/vnd.apha.1+json'
```

## Success response (`200 OK`)

```json
{
  "data": {
    "type": "case",
    "id": "500ABC123456789",
    "attributes": {
      "caseNumber": "00001234",
      "status": "Preparing",
      "priority": "Medium",
      "contactId": "003XYZ987654321",
      "createdDate": "2026-02-09T10:30:00.000Z",
      "lastModifiedDate": "2026-02-09T11:45:00.000Z"
    }
  },
  "links": {
    "self": "/case-management/case/500ABC123456789"
  }
}
```

## Error responses

| Status | When it happens                                                | Typical code                                                   |
| ------ | -------------------------------------------------------------- | -------------------------------------------------------------- |
| `400`  | Missing/invalid `X-Forwarded-Authorization` or malformed input | `BAD_REQUEST` / `MISSING_QUERY_PARAMETER` / `VALIDATION_ERROR` |
| `404`  | Case ID not found                                              | `NOT_FOUND` / `CASE_NOT_FOUND`                                 |
| `500`  | Upstream retrieval failure                                     | `INTERNAL_SERVER_ERROR` / `DATABASE_ERROR`                     |

Example missing forwarded auth:

```json
{
  "message": "User authentication required",
  "code": "BAD_REQUEST",
  "errors": [
    {
      "code": "MISSING_QUERY_PARAMETER",
      "message": "X-Forwarded-Authorization header with valid email claim is required"
    }
  ]
}
```

## Practical tips

- Always pass a valid `X-Forwarded-Authorization` header for this endpoint.
- Expect `404` for unknown case IDs.
- The endpoint retries transient upstream errors automatically before returning `500`.

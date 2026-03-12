# POST /case-management/users/find

Use this endpoint to check whether a case-management user exists for a given email address.

## What this endpoint does

- Searches for an active case-management user by email.
- Returns a lightweight user reference if found.
- Returns an empty array when not found.

This is intentionally a lookup endpoint, not a full profile endpoint.

## Authentication and headers

- `Authorization: Bearer <service-token>` is required.
- `Accept: application/vnd.apha.1+json` is supported.
- `Content-Type: application/json` is required.

## Request

### JSON body

| Field          | Type   | Required | Rules                        |
| -------------- | ------ | -------- | ---------------------------- |
| `emailAddress` | string | Yes      | Must be a valid email format |

Example:

```json
{
  "emailAddress": "user@example.com"
}
```

## Success response (`200 OK`)

### When a user exists

```json
{
  "data": [
    {
      "type": "case-management-user",
      "id": "005ABC123456789"
    }
  ],
  "links": {
    "self": "/case-management/users/find"
  }
}
```

### When no user exists

```json
{
  "data": [],
  "links": {
    "self": "/case-management/users/find"
  }
}
```

## Error responses

| Status | When it happens                                | Typical code                               |
| ------ | ---------------------------------------------- | ------------------------------------------ |
| `400`  | Invalid email format or malformed request body | `BAD_REQUEST` / `VALIDATION_ERROR`         |
| `401`  | Missing or invalid bearer token                | Unauthorized by auth layer                 |
| `500`  | Upstream query failures after retries          | `INTERNAL_SERVER_ERROR` / `DATABASE_ERROR` |

Example invalid email:

```json
{
  "message": "Your request could not be processed",
  "code": "BAD_REQUEST",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "emailAddress provided is not in a valid format"
    }
  ]
}
```

## Practical tips

- Treat `data: []` as a normal “not found” response.
- Use lowercase/trimmed email values from your own system where possible.
- The endpoint retries transient upstream failures automatically, so occasional calls may take longer before a final `500`.

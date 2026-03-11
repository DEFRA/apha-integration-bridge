# POST /oauth2/token

Use this endpoint to obtain an OAuth access token using `client_credentials`.

## What this endpoint does

- Accepts client credentials as form data.
- Requests a token from Cognito.
- Returns token payload (`access_token`, `token_type`, `expires_in`).

This endpoint is feature-flagged and intended for lower/non-production environments.

## Authentication and headers

- Endpoint auth is disabled.
- Do not send bearer auth to this endpoint.
- `Content-Type: application/x-www-form-urlencoded` is required.

## Request

### Form fields

| Field           | Type   | Required | Rules                                |
| --------------- | ------ | -------- | ------------------------------------ |
| `grant_type`    | string | Yes      | Must be exactly `client_credentials` |
| `client_id`     | string | Yes      | Cognito app client ID                |
| `client_secret` | string | Yes      | Cognito app client secret            |

Example:

```bash
curl -X POST 'https://<host>/oauth2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'grant_type=client_credentials&client_id=<client-id>&client_secret=<client-secret>'
```

## Success response (`200 OK`)

```json
{
  "access_token": "eyJraWQiOi...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## Error responses

| Status | When it happens                                                 | Typical code                     |
| ------ | --------------------------------------------------------------- | -------------------------------- |
| `404`  | Endpoint feature is disabled in your environment                | Route not registered             |
| `400`  | Invalid form fields or non-success response from token provider | `BAD_REQUEST` / validation error |
| `500`  | Network/upstream connectivity issues while requesting token     | `INTERNAL_SERVER_ERROR`          |

## Practical tips

- Keep credentials out of logs and client-side error telemetry.
- Refresh token before `expires_in` is reached.
- If this endpoint is disabled in your environment, request credentials via your normal platform auth flow.

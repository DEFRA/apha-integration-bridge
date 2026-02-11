# GET /case-management/case/{caseId}

Retrieves a case by ID from Salesforce using user-context authentication. This endpoint **requires** the `X-Forwarded-Authorization` header containing a user's identity token.

## Endpoint

```
GET /case-management/case/{caseId}
```

## Authentication

This endpoint requires **dual authentication**:

1. Service-level authorization via `Authorization` header (Cognito token)
2. User identity via `X-Forwarded-Authorization` header (Azure AD JWT with email claim)

The endpoint will return a 400 Bad Request if the `X-Forwarded-Authorization` header is missing or does not contain a valid email claim.

## Headers

### Required

- `Authorization`: Bearer token for service-to-service authorization (Cognito token)
- `X-Forwarded-Authorization`: User identity token (Azure AD JWT) containing `email` claim
- `Accept`: `application/vnd.apha.1+json` (default) - API versioning header

## Path Parameters

- `caseId` (string, required) - Salesforce Case ID (e.g., "500ABC123456789")

## User Context Authentication

This endpoint uses **JWT Bearer flow** to make Salesforce API calls in the authenticated user's context.

**Authentication Flow:**

1. Client sends Cognito token in `Authorization` header (service authorization)
2. Client sends Azure AD JWT in `X-Forwarded-Authorization` header (user identity)
3. Integration Bridge extracts `email` claim from Azure AD JWT using jose library
4. Integration Bridge creates a Salesforce JWT assertion for that email
5. Integration Bridge exchanges the JWT assertion for a Salesforce access token
6. Salesforce query is executed with the user's access token (respecting user's permissions)
7. Token is cached per-user until expiry for performance

## Response

### Success Response (200 OK)

Returns the case details with the following fields:

- `caseNumber` (string) - Auto-generated case number
- `status` (string) - Case status (e.g., "Preparing", "In Progress", "Closed")
- `priority` (string) - Case priority (e.g., "High", "Medium", "Low")
- `contactId` (string) - Salesforce Contact ID associated with this case
- `createdDate` (string) - ISO 8601 timestamp of when the case was created
- `lastModifiedDate` (string) - ISO 8601 timestamp of when the case was last modified

### Example Response

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

## Example Request

**Note:** Both headers are required for this endpoint.

```bash
curl -X GET \
  https://api.example.com/case-management/case/500ABC123456789 \
  -H 'Authorization: Bearer <cognito--token>' \
  -H 'X-Forwarded-Authorization: Bearer <azure-ad-jwt>' \
  -H 'Accept: application/vnd.apha.1+json'
```

The Azure AD JWT must contain a valid `email` claim. Example decoded payload:

```json
{
  "aud": "00000003-0000-0000-c000-000000000000",
  "iss": "https://sts.windows.net/<tenant-id>/",
  "email": "user@defra.gov.uk",
  "exp": 1234567890,
  "iat": 1234567890
}
```

## Error Responses

### 400 Bad Request - Missing User Context

Returned when the `X-Forwarded-Authorization` header is missing or does not contain a valid `email` claim.

```json
{
  "statusCode": 400,
  "error": "Bad Request",
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

### 400 Bad Request - Validation Error

Returned when the request fails validation (e.g., missing required headers).

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Invalid request parameters",
  "code": "BAD_REQUEST",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "\"authorization\" is required"
    }
  ]
}
```

### 404 Not Found

Returned when the case with the specified ID does not exist.

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Case not found",
  "errors": [
    {
      "code": "CASE_NOT_FOUND",
      "message": "Case with ID 500ABC123456789 was not found"
    }
  ]
}
```

### 500 Internal Server Error

Returned when the case retrieval fails in Salesforce or an internal error occurs.

```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "Your request could not be processed",
  "errors": [
    {
      "code": "DATABASE_ERROR",
      "message": "Cannot retrieve case from the case management service"
    }
  ]
}
```

## Retry Logic

The endpoint implements automatic retry logic with the following configuration:

- Maximum retries: 3
- Maximum retry time: 10 seconds
- Exponential backoff factor: 2
- Minimum timeout: 1 second
- Maximum timeout: 4 seconds

## Logging

The endpoint logs the following:

1. **Operation failures** - Logs failed operations with reference IDs, status codes, and error details
2. **General failures** - Logs unexpected errors with full error context

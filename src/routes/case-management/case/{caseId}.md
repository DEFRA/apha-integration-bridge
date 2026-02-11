# GET /case-management/case/{caseId}

Retrieves a case by ID from Salesforce with user-context-aware authentication. This endpoint supports both system-level and user-level authentication depending on the headers provided.

## Endpoint

```
GET /case-management/case/{caseId}
```

## Authentication

This endpoint requires Bearer token authentication via the `Authorization` header. Optionally supports user-level authentication via the `X-Forwarded-Authorization` header.

## Headers

### Required

- `Authorization`: Bearer token for machine-to-machine authorization (e.g., Cognito M2M token)
- `Accept`: `application/vnd.apha.1+json` (default) - API versioning header

### Optional

- `X-Forwarded-Authorization`: User identity token (Azure AD JWT or Customer Identity JWT)
  - When provided, the API call is made in the authenticated user's context
  - When omitted, the API call uses system-level credentials

## Path Parameters

- `caseId` (string, required) - Salesforce Case ID (e.g., "500ABC123456789")

## User Context Awareness

This endpoint supports dual authentication modes to enable different use cases:

### System-Level Authentication (Machine-to-Machine)

- Uses OAuth 2.0 client credentials flow
- API calls are made with system-level Salesforce credentials

**Headers:**

```
Authorization: Bearer <cognito-m2m-token>
```

### User-Level Authentication (JWT Bearer)

- Uses JWT Bearer flow with the authenticated user's identity
- Appropriate for user-initiated requests from UIs (e.g., Case Management UI)
- API calls are made in the user's Salesforce context

**Headers:**

```
Authorization: Bearer <cognito-m2m-token>
X-Forwarded-Authorization: Bearer <azure-ad-jwt>
```

## Authentication Flow

### For Defra Internal Users (Case Management UI)

1. Client sends Cognito M2M token in `Authorization` header
2. Client sends Azure AD JWT in `X-Forwarded-Authorization` header
3. Integration Bridge extracts email from Azure AD JWT
4. Integration Bridge creates Salesforce JWT token for that user
5. Salesforce API call is made in the user's context with their permissions

### For Public Users (Future - Licensing Frontend)

1. Client sends Cognito M2M token in `Authorization` header
2. Client sends Customer Identity JWT in `X-Forwarded-Authorization` header
3. Integration Bridge makes system-level call to Salesforce
4. Integration Bridge validates that the Contact on the Case matches the authenticated user

**Note:** Public user authentication is planned for future implementation. Currently, only internal user authentication is supported.

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

## Example Requests

### System-Level Request (No User Context)

```bash
curl -X GET \
  https://api.example.com/case-management/case/500ABC123456789 \
  -H 'Authorization: Bearer <cognito-m2m-token>' \
  -H 'Accept: application/vnd.apha.1+json'
```

### User-Level Request (With Azure AD JWT)

```bash
curl -X GET \
  https://api.example.com/case-management/case/500ABC123456789 \
  -H 'Authorization: Bearer <cognito-m2m-token>' \
  -H 'X-Forwarded-Authorization: Bearer <azure-ad-jwt>' \
  -H 'Accept: application/vnd.apha.1+json'
```

## Error Responses

### 400 Bad Request

Returned when the request fails validation (e.g., missing required headers).

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation error",
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

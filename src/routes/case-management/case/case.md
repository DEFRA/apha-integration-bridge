# Create Case

Creates a new case in Salesforce using a composite API request. This endpoint processes license application data and submits it to Salesforce as a transactional composite request with automatic retry logic.

## Endpoint

```
POST /case-management/case
```

## Authentication

This endpoint requires Bearer token authentication via the `Authorization` header.

## Headers

- `Accept`: `application/vnd.apha.1+json` (default) - API versioning header
- `Content-Type`: `application/json` - Required for JSON payload

## Request

The endpoint accepts a composite request payload containing all details required to create a case in Salesforce.

### Request Body Schema

The request must include:

- `journeyId` (string, required) - Identifier for the application journey
- `journeyVersion` (object, required) - Version information with `major` and `minor` numbers
- `applicationReferenceNumber` (string, required) - Unique reference number for the application
- `sections` (array, required) - Array of form sections containing question-answer pairs
  - `sectionKey` (string, required) - Unique key identifying the section
  - `title` (string, required) - Display title of the section
  - `questionAnswers` (array, required) - Array of question-answer pairs
    - `question` (string, required) - Question text
    - `questionKey` (string, required) - Unique key for the question
    - `answer` (object, required) - Answer details
      - `type` (string, required) - Type of answer
      - `value` (any, required) - Answer value
      - `displayText` (string, required) - Human-readable answer text
- `keyFacts` (object, required) - Key information about the license application
  - `licenceType` (string, required) - Type of license being requested
  - `requester` (string, required) - Either 'origin' or 'destination'
  - `movementDirection` (string, optional) - Either 'on' or 'off'
  - `numberOfCattle` (number, optional) - Number of cattle involved
  - `originCph` (string, optional) - Origin County Parish Holding number
  - `originAddress` (object, optional) - Origin address details
    - `addressLine1` (string, required)
    - `addressLine2` (string, optional)
    - `addressTown` (string, required)
    - `addressCounty` (string, optional)
    - `addressPostcode` (string, required)
  - `originKeeperName` (object, optional) - Origin keeper name
    - `firstName` (string, required)
    - `lastName` (string, required)
  - `destinationCph` (string, optional) - Destination County Parish Holding number
  - `destinationAddress` (object, optional) - Destination address details (same schema as origin)
  - `destinationKeeperName` (object, optional) - Destination keeper name (same schema as origin)
  - `requesterCph` (string, optional) - Requester's County Parish Holding number
  - `additionalInformation` (string, optional) - Additional information text
  - `biosecurityMaps` (array of strings, optional) - Array of biosecurity map references
- `applicant` (object, required) - Guest customer details
  - `type` (string, required) - Must be 'guest'
  - `emailAddress` (string, required) - Valid email address
  - `name` (object, required) - Applicant name
    - `firstName` (string, required)
    - `lastName` (string, required)

### Example Request

```json
{
  "journeyId": "TB123",
  "journeyVersion": {
    "major": 1,
    "minor": 0
  },
  "applicationReferenceNumber": "TB-ABCD-1234",
  "sections": [
    {
      "sectionKey": "sectionKey1",
      "title": "Section title",
      "questionAnswers": [
        {
          "question": "Question",
          "questionKey": "questionKey",
          "answer": {
            "type": "number",
            "value": 1,
            "displayText": "1"
          }
        }
      ]
    }
  ],
  "keyFacts": {
    "licenceType": "TB Movement License",
    "requester": "origin",
    "numberOfCattle": 50,
    "originCph": "12/345/6789",
    "originAddress": {
      "addressLine1": "Farm House",
      "addressTown": "Exampletown",
      "addressPostcode": "EX1 2AB"
    },
    "originKeeperName": {
      "firstName": "John",
      "lastName": "Smith"
    }
  },
  "applicant": {
    "type": "guest",
    "emailAddress": "john.smith@example.com",
    "name": {
      "firstName": "John",
      "lastName": "Smith"
    }
  }
}
```

## Response

### Success Response (201 Created)

Returns the created case details including the Salesforce composite response.

```json
{
  "data": [
    {
      "id": "TB-ABCD-1234",
      "type": "case-management-case",
      "compositeResponse": [
        {
          "body": {
            "id": "5001234567890ABC",
            "success": true
          },
          "httpHeaders": {
            "Content-Type": "application/json"
          },
          "httpStatusCode": 201,
          "referenceId": "createCase"
        }
      ]
    }
  ],
  "links": {
    "self": "case-management/case"
  }
}
```

### Error Responses

#### 400 Bad Request

Returned when the request payload fails validation.

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation error",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "\"applicationReferenceNumber\" is required"
    }
  ]
}
```

#### 500 Internal Server Error

Returned when the case creation fails in Salesforce or an internal error occurs.

```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "Your request could not be processed",
  "errors": [
    {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "Could not create case on the case management service"
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

## Transaction Handling

All sub-requests within the composite request are executed transactionally. If any sub-request fails, the entire operation is rolled back and an error response is returned with details of the failed operations.

## Logging

The endpoint logs errors in two scenarios:

1. **Composite operation failures** - Logs failed operations with reference IDs, status codes, and error details
2. **General failures** - Logs unexpected errors with full error context

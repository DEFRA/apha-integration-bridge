# Create Case

Creates a new case in Salesforce using a composite API request. This endpoint processes license application data and submits it to Salesforce as a transactional composite request with automatic retry logic.

## What this endpoint does

- Validates and accepts a structured case payload.
- Creates required case-management records.
- Optionally processes file references from your `sections` answers.
- Returns `201 Created` when the case workflow completes.

## Authentication and headers

- Endpoint-level auth is disabled in the route.
- `Accept: application/vnd.apha.1+json` is supported.
- `Content-Type: application/json` is required.

## Request

### Top-level JSON fields

| Field                        | Type   | Required | Notes                                      |
| ---------------------------- | ------ | -------- | ------------------------------------------ |
| `journeyId`                  | string | Yes      | Journey identifier from your calling flow  |
| `journeyVersion`             | object | Yes      | Must contain integer `major` and `minor`   |
| `applicationReferenceNumber` | string | Yes      | Your unique application reference          |
| `sections`                   | array  | Yes      | List of captured form sections and answers |
| `keyFacts`                   | object | Yes      | Case summary values used for creation      |
| `applicant`                  | object | Yes      | Must represent a guest applicant           |

### `sections` shape

Each section requires:

- `sectionKey` (string)
- `title` (string)
- `questionAnswers` (array)

Each `questionAnswers` item requires:

- `question` (string)
- `questionKey` (string)
- `answer` object:
  - `type` (string)
  - `value` (any)
  - `displayText` (string, can be empty)

### `keyFacts` shape

Required keys:

- `licenceType`: `{ "type": "text", "value": "..." }`
- `requester`: `{ "type": "text", "value": "origin" | "destination" }`

Common optional keys include:

- `movementDirection` (`on` or `off`)
- `numberOfCattle`
- `originCph`, `destinationCph`, `requesterCph`
- `originAddress`, `destinationAddress`
- `originKeeperName`, `destinationKeeperName`
- `additionalInformation`
- `biosecurityMaps` (array of file reference strings)

### `applicant` shape

- `type`: must be `guest`
- `emailAddress`: valid email
- `name`: `{ "firstName": "...", "lastName": "..." }`

### Minimal valid example

```json
{
  "journeyId": "JOURNEY_ID",
  "journeyVersion": {
    "major": 1,
    "minor": 0
  },
  "applicationReferenceNumber": "TB-1234-ABCD",
  "sections": [
    {
      "sectionKey": "section-key",
      "title": "Applicant details",
      "questionAnswers": [
        {
          "question": "What is your email address?",
          "questionKey": "email",
          "answer": {
            "type": "text",
            "value": "test@example.com",
            "displayText": "test@example.com"
          }
        }
      ]
    }
  ],
  "keyFacts": {
    "licenceType": {
      "type": "text",
      "value": "TB15"
    },
    "requester": {
      "type": "text",
      "value": "destination"
    }
  },
  "applicant": {
    "type": "guest",
    "emailAddress": "test@example.com",
    "name": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

## File-reference behavior

If any answer has:

- `answer.type = "file"`
- and `answer.value.path` present

the path is treated as a file reference for supporting material handling.

## Success response (`201 Created`)

- Status code: `201`
- Body: empty

The endpoint signals success through the status code rather than a response payload.

## Error responses

| Status | When it happens                        | Typical code                       |
| ------ | -------------------------------------- | ---------------------------------- |
| `400`  | Payload validation failed              | `BAD_REQUEST` / `VALIDATION_ERROR` |
| `500`  | Case creation workflow failed upstream | `INTERNAL_SERVER_ERROR`            |

Example `400`:

```json
{
  "message": "Invalid request parameters",
  "code": "BAD_REQUEST",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "\"applicationReferenceNumber\" is required"
    }
  ]
}
```

Example `500`:

```json
{
  "message": "Your request could not be processed",
  "code": "INTERNAL_SERVER_ERROR",
  "errors": [
    {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "Could not create case on the case management service"
    }
  ]
}
```

## Practical tips

- Always treat `201` as the source of truth for success.
- Keep `applicationReferenceNumber` stable and unique per submission.
- For troubleshooting, keep your original payload so validation errors are easy to replay.

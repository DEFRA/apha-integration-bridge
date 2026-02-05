# Find Case Management User

Finds if a user exists in Salesforce by their email address.

This endpoint allows you to query the case management service (Salesforce) to determine if a user with a given email address exists in the system. This is used for implementing authorization in the apha-apps-perms-case-mgmt-ui.

## Request

**Method:** POST

**Path:** `/case-management/users/find`

**Headers:**

- `Content-Type: application/json`
- `Accept: application/vnd.apha.1+json`

**Body:**

```json
{
  "emailAddress": "user@example.com"
}
```

## Response Scenarios

### User Exists in Salesforce

**Status:** 200 OK

**Body:**

```json
{
  "data": [
    {
      "id": "<user-id>",
      "type": "case-management-user"
    }
  ]
}
```

### User Does Not Exist in Salesforce

**Status:** 200 OK

**Body:**

```json
{
  "data": []
}
```

### Invalid Email Format

**Status:** 400 BAD REQUEST

**Body:**

```json
{
  "message": "Your request could not be processed",
  "code": "BAD_REQUEST",
  "errors": [
    {
      "code": "BAD_REQUEST",
      "message": "emailAddress provided is not in a valid format"
    }
  ]
}
```

### Salesforce Service Error

When Salesforce cannot be reached, does not respond, or returns an error, the endpoint will retry with exponential backoff (3 times within a maximum of 10 seconds).

**Status:** 500 INTERNAL SERVER ERROR

**Body:**

```json
{
  "message": "Your request could not be processed",
  "code": "INTERNAL_SERVER_ERROR",
  "errors": [
    {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "Cannot perform query successfully on the case management service"
    }
  ]
}
```

## Notes

- Email validation uses Joi's email validation without top-level domain constraints
- The endpoint implements automatic retry with exponential backoff (3 retries within 10 seconds maximum)
- Error logs are emitted with sufficient detail for debugging when Salesforce queries fail
- Test user: `aphadev.mehboob.alam@defra.gov.uk` exists in the QA environment

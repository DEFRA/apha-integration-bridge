This endpoint is a convenience proxy to Cognito's OAuth2 token endpoint.
It is **only available in local and dev environments** to help developers
easily obtain access tokens for testing.

**Use this endpoint to get the token to use with other APIs.**

**Usage:**

1. Provide your `client_id` and `client_secret`
2. Set `grant_type` to `client_credentials`
3. The endpoint will return a Cognito access token
4. Use the `access_token` from the response in the "Authorize" button above

**Note:** This endpoint is disabled in production environments.

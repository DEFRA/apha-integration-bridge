This endpoint is a convenience proxy to Cognito's OAuth2 token endpoint.
It is **only available in local and dev environments** to help developers
easily obtain access tokens for testing.

**Auto-Authorization:** When you execute this endpoint, Swagger UI will be
**automatically authorized** with the returned token - no manual copy/paste needed!

**Usage:**

1. Click "Try it out" below
2. Provide your `client_id` and `client_secret`
3. Set `grant_type` to `client_credentials`
4. Click "Execute"
5. You'll see a confirmation message and Swagger UI will be authorized
6. All authenticated API endpoints are now ready to use

**Note:** This endpoint is disabled in production environments.

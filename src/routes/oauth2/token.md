This endpoint provides a convenient way to obtain Cognito access tokens directly from Swagger UI.

**How it works:**

- When you execute this endpoint, your browser calls Cognito **directly** (not through the API)

**Auto-Authorization:** When you execute this endpoint, Swagger UI will be
**automatically authorized** with the returned token - no manual copy/paste needed!

**Usage:**

1. Click "Try it out" below
2. Provide your `client_id` and `client_secret`
3. Set `grant_type` to `client_credentials`
4. Click "Execute"
5. The browser will call Cognito directly
6. You'll see a confirmation message and Swagger UI will be automatically authorized
7. All authenticated API endpoints are now ready to use

**Note:** This endpoint is disabled in production environments.

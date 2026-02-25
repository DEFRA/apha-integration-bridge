import swagger from 'hapi-swagger'
import { config } from '../../config.js'

const description = `
Welcome to the APH Integration Bridge API documentation. This API provides secure and modern access to various APH systems.

[Get support on our Slack channel](https://defra-digital-team.slack.com/archives/C095FKF6ETH)

[Find out more about this API](https://github.com/DEFRA/apha-api-documentation)
`

const OPENAPI_JSON_PATH = '/.well-known/openapi/v1/openapi.json'

const authDescription = config.get('featureFlags.isTokenEndpointEnabled')
  ? `Authentication endpoints for obtaining access tokens.

**How to use:**
1. Click "Try it out" on the \`/oauth2/token\` endpoint below
2. Enter your Cognito \`client_id\` and \`client_secret\`
3. Click "Execute"
4. **You'll be automatically authorized!** The access token will be applied to Swagger UI automatically.

**How it works:**
- Your browser calls Cognito **directly** (not through the API)

**Note:** This endpoint is disabled in production environments.`
  : 'Authentication endpoints for obtaining access tokens. Available in lower environments only.'

export const openApi = {
  plugin: swagger,
  options: {
    jsonPath: OPENAPI_JSON_PATH,
    OAS: 'v3.0',
    info: {
      title: 'APHA Integration Bridge API',
      version: '1.0.0',
      description
    },
    uiCompleteScript: config.get('featureFlags.isTokenEndpointEnabled')
      ? { src: '/swaggerui/cognito-auth' }
      : null,
    tags: [
      {
        name: 'auth',
        description: authDescription
      },
      {
        name: 'holdings',
        description:
          'Check if a county parish holding (CPH) number exists in Sam and get basic information about the holding.'
      }
    ],
    securityDefinitions: {
      Bearer: {
        type: 'http',
        scheme: 'bearer',
        description:
          'To make authenticated requests to the APHA Integration API, you must have a valid **Cognito issued access token**.'
      }
    },
    grouping: 'tags',
    sortEndpoints: 'ordered'
  }
}

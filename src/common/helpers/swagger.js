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

const swaggerUiSchemePatchScript = `
try {
  const currentSpecification = window.ui.specSelectors.specJson().toJS()
  const currentOrigin = window.location.origin

  if (currentOrigin.startsWith('https://') && currentSpecification) {
    const updatedSpecification = {
      ...currentSpecification,
      servers: [{ url: currentOrigin }]
    }

    window.ui.specActions.updateJsonSpec(updatedSpecification)
  }
} catch (error) {
  console.warn('[Swagger UI] Unable to apply HTTPS server patch', error)
}
`

const cognitoAuthScriptLoader = config.get(
  'featureFlags.isTokenEndpointEnabled'
)
  ? `
const scriptElement = document.createElement('script')
scriptElement.src = '/swaggerui/cognito-auth'
scriptElement.type = 'text/javascript'
document.body.appendChild(scriptElement)
`
  : ''

const uiCompleteScript = `${swaggerUiSchemePatchScript}\n${cognitoAuthScriptLoader}`

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
    uiCompleteScript,
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
    sortEndpoints: 'ordered',
    documentationPage: true,
    swaggerUI: true
  }
}

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config } from '../../config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * @typedef {import('@hapi/hapi').Request} Request
 * @typedef {import('@hapi/hapi').ResponseObject} ResponseObject
 * @typedef {import('@hapi/hapi').ResponseToolkit} ResponseToolkit
 */

/**
 * Handler for serving Cognito authentication script with injected configuration
 *
 * @param {Request} _request
 * @param {ResponseToolkit} h
 */
async function handler(_request, h) {
  const cognitoTokenUrl = config.get('cognito.tokenUrl')
  const scriptPath = path.join(__dirname, 'cognito-auth-script.js')
  const scriptContent = await readFile(scriptPath, 'utf-8')

  const configInjection = `window.COGNITO_TOKEN_URL = ${JSON.stringify(cognitoTokenUrl)};\n\n`
  const script = configInjection + scriptContent

  return h.response(script).type('application/javascript')
}

const options = {
  auth: false,
  description:
    'Internal endpoint that serves Cognito authentication script for Swagger UI',
  notes:
    'This endpoint is not part of the public API and should not be called directly',
  plugins: {
    'hapi-swagger': {
      'x-hidden': true,
      security: []
    }
  }
}

const isEnabled = config.get('featureFlags.isTokenEndpointEnabled')

export default isEnabled ? { method: 'GET', handler, options } : null

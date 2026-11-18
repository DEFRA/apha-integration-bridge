import fs from 'node:fs'
import path from 'node:path'

import { config } from '../../config.js'

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
export const options = {
  auth: false
}

const htmlTemplate = fs.readFileSync(
  path.join(import.meta.dirname, 'scalar.get.html'),
  'utf8'
)

const resolveHtml = () =>
  htmlTemplate.replaceAll('{{tokenUrl}}', config.get('cognito.tokenUrl') ?? '')

export const handler = (_request, h) =>
  h.response(resolveHtml()).type('text/html')

const route = {
  method: 'GET',
  path: '/documentation/scalar',
  options,
  handler
}

export default route

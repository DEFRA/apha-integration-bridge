import { salesforceClient } from '../lib/salesforce/client.js'

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
export const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'salesforce'],
  description: 'Execute a SQL query against Salesforce',
  plugins: {
    'hapi-swagger': {
      id: 'salesforce',
      security: [{ Bearer: [] }]
    }
  }
}

/**
 * @type {import('@hapi/hapi').Lifecycle.Method}
 */
export async function handler(request, h) {
  const query =
    request.query.q ||
    "SELECT ID FROM User WHERE Username='aphadev.mehboob.alam@defra.gov.uk' AND IsActive=true LIMIT 1"

  const result = await salesforceClient.sendQuery(query, request.logger)

  return h.response(result).code(200)
}

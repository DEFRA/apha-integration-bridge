import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  GetUnitsSchema,
  getUnitsQuery
} from '../../../../lib/db/queries/get-units.js'
import { execute } from '../../../../lib/db/operations/execute.js'

const __dirname = new URL('.', import.meta.url).pathname

export const options = {
  tags: ['api', 'holdings'],
  description: 'Get holdings...',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), '{holdingsId}.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'list' // refer to notes above
    }
  },
  validate: {
    params: GetUnitsSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.integration-bridge.v1+json')
        .description('Accept header for API versioning')
    }).options({ allowUnknown: true })
  }
}

export async function handler(request, h) {
  await using oracledb = await request.server['oracledb.sam']()

  const query = getUnitsQuery(request.params)

  const rows = await execute(oracledb.connection, query)

  return h.response(rows).code(200)
}

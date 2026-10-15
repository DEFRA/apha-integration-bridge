import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  HTTPExceptionSchema,
  HTTPException
} from '../../../../../../lib/http/http-exception.js'

import { holdingParties } from './parties.mocks.js'
import {
  HoldingParamsSchema,
  mockHoldingHandler
} from '../../../../helpers/holding.js'
import { SelfLink } from '../../../../../../types/alpha/links.js'
import { Party } from '../../../../../../types/alpha/parties.js'

const GetHoldingPartiesSchema = Joi.object({
  data: Joi.array().items(Party).min(1).required(),
  links: SelfLink
})
  .description('Everyone involved with the CPH, with their involvements')
  .label('Holding Parties Response')

const __dirname = new URL('.', import.meta.url).pathname

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: false,
  tags: ['api', 'holdings'],
  description: 'Retrieve the parties involved with a CPH',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), 'parties.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'holdings-parties',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    params: HoldingParamsSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning')
    }).options({ allowUnknown: true }),
    failAction: HTTPException.failValidation
  },
  response: {
    status: {
      200: GetHoldingPartiesSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

const handler = mockHoldingHandler(holdingParties)

export default {
  method: 'GET',
  handler,
  options
}

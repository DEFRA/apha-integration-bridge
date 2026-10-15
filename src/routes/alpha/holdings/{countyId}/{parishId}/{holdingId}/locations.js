import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  HTTPExceptionSchema,
  HTTPException
} from '../../../../../../lib/http/http-exception.js'

import { holdingLocations } from './locations.mocks.js'
import {
  HoldingParamsSchema,
  mockHoldingHandler
} from '../../../../helpers/holding.js'
import { SelfLink } from '../../../../../../types/alpha/links.js'
import { HoldingLocation } from '../../../../../../types/alpha/holdings.js'

const GetHoldingLocationsSchema = Joi.object({
  data: Joi.array().items(HoldingLocation).min(1).required(),
  links: SelfLink
})
  .description('Every location the CPH is currently held at')
  .label('Holding Locations Response')

const __dirname = new URL('.', import.meta.url).pathname

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: false,
  tags: ['api', 'holdings'],
  description: 'Retrieve the locations a CPH is held at',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), 'locations.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'holdings-locations',
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
      200: GetHoldingLocationsSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

const handler = mockHoldingHandler(holdingLocations)

export default {
  method: 'GET',
  handler,
  options
}

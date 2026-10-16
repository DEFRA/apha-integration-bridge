import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  HTTPExceptionSchema,
  HTTPException
} from '../../../../../../lib/http/http-exception.js'

import { holdingSuppliers } from './suppliers.mocks.js'
import {
  HoldingParamsSchema,
  mockHoldingHandler
} from '../../../../helpers/holding.js'
import { SelfLink } from '../../../../../../types/alpha/links.js'
import { HoldingSupplier } from '../../../../../../types/alpha/holdings.js'

const GetHoldingSuppliersSchema = Joi.object({
  data: Joi.array().items(HoldingSupplier).required(),
  links: SelfLink
})
  .description('The vet practice and delivery partner per livestock unit')
  .label('Holding Suppliers Response')

const __dirname = new URL('.', import.meta.url).pathname

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: false,
  tags: ['api', 'holdings'],
  description: 'Retrieve the vet suppliers of a CPH',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), 'suppliers.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'holdings-suppliers',
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
      200: GetHoldingSuppliersSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

const handler = mockHoldingHandler(holdingSuppliers)

export default {
  method: 'GET',
  handler,
  options
}

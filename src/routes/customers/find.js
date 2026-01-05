import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  HTTPExceptionSchema,
  HTTPException
} from '../../lib/http/http-exception.js'

import { all } from './find.mocks.js'
import { CustomersData } from '../../types/customers.js'
import { HTTPArrayResponse } from '../../lib/http/http-response.js'
import { LinksReference } from '../../types/links.js'

const PostFindCustomersSchema = Joi.object({
  data: Joi.array().items(CustomersData).required(),
  links: LinksReference
})
  .description('Customer Details')
  .label('Find Customer Response')

const PostFindPayloadSchema = Joi.object({
  ids: Joi.array().items(Joi.string()).required().label('Customer ids')
})

const __dirname = new URL('.', import.meta.url).pathname

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: false,
  tags: ['api', 'customers'],
  description: 'Retrieve customers filtered by ids',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), 'find.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'customers-find',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    payload: PostFindPayloadSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning')
    }).options({ allowUnknown: true }),
    failAction: HTTPException.failValidation
  },
  response: {
    status: {
      200: PostFindCustomersSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

/**
 * @type {import('@hapi/hapi').Lifecycle.Method}
 */
async function handler(request, h) {
  const response = new HTTPArrayResponse({
    self: `/customers/find`
  })

  for (const customer of all) {
    response.add(customer)
  }
  return h.response(response.toResponse()).code(200)
}

export default {
  method: 'POST',
  handler,
  options
}

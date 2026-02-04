import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  HTTPExceptionSchema,
  HTTPException
} from '../../../lib/http/http-exception.js'

import { all } from './find.mocks.js'
import { mockFindHandler } from '../helpers/find.js'
import { PaginationSchema } from '../../../types/alpha/pagination.js'
import { PaginatedLink } from '../../../types/alpha/links.js'
import { Customer } from '../../../types/alpha/customers.js'

const PostFindCustomersSchema = Joi.object({
  data: Joi.array().items(Customer).required(),
  links: PaginatedLink
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
  description: 'Retrieve customers by ids',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), 'find.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'locations-find',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    payload: PostFindPayloadSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning'),
      'Content-Type': Joi.string().allow('application/json')
    }).options({ allowUnknown: true }),
    query: PaginationSchema,
    failAction: HTTPException.failValidation
  },
  response: {
    status: {
      200: PostFindCustomersSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}
const handler = mockFindHandler(all)

export default {
  method: 'POST',
  handler,
  options
}

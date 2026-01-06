import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  HTTPExceptionSchema,
  HTTPException
} from '../../lib/http/http-exception.js'

import { all } from './find.mocks.js'
import { HTTPArrayResponse } from '../../lib/http/http-response.js'
import { LinksReference } from '../../types/links.js'
import { LocationsHydrated } from '../../types/locations.js'

const PostFindLocationsSchema = Joi.object({
  data: Joi.array().items(LocationsHydrated).required(),
  links: LinksReference
})
  .description('Location Details')
  .label('Find Location Response')

const PostFindPayloadSchema = Joi.object({
  ids: Joi.array().items(Joi.string()).required().label('Location ids')
})

const __dirname = new URL('.', import.meta.url).pathname

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: false,
  tags: ['api', 'locations'],
  description: 'Retrieve locations by ids',
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
    failAction: HTTPException.failValidation
  },
  response: {
    status: {
      200: PostFindLocationsSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

/**
 * @type {import('@hapi/hapi').Lifecycle.Method}
 */
async function handler(request, h) {
  const response = new HTTPArrayResponse({
    self: `/locations/find`
  })

  const { ids } = request.payload

  for (const location of all) {
    if (ids.includes(location.id)) {
      response.add(location)
    }
  }
  return h.response(response.toResponse()).code(200)
}

export default {
  method: 'POST',
  handler,
  options
}

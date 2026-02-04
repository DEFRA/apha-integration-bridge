import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  HTTPExceptionSchema,
  HTTPException
} from '../../../lib/http/http-exception.js'

import { Holdings } from '../../../types/alpha/holdings.js'
import { holdings } from './find.mocks.js'
import { PaginatedLink } from '../../../types/alpha/links.js'
import { PaginationSchema } from '../../../types/alpha/pagination.js'

const PostFindHoldingsSchema = Joi.object({
  data: Joi.array().items(Holdings).required(),
  links: PaginatedLink
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
  tags: ['api', 'holdings'],
  description: 'Retrieve holdings by ids',
  notes: fs.readFileSync(
    path.join(decodeURIComponent(__dirname), 'find.md'),
    'utf8'
  ),
  plugins: {
    'hapi-swagger': {
      id: 'holdings-find',
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
      200: PostFindHoldingsSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

/**
 * @param {URLSearchParams} query
 */
const movePage = (query, moveBy) => {
  const page = parseInt(query.get('page'))
  const newQuery = new URLSearchParams(query.toString())
  newQuery.set('page', page + moveBy)
  return newQuery
}

/**
 * @type {import('@hapi/hapi').Lifecycle.Method}
 */
async function handler(request, h) {
  const holdingMap = Object.fromEntries(
    holdings.map((holding) => [holding.id, holding])
  )
  const { page, pageSize } = request.query
  const query = new URLSearchParams(request.query)

  const zeroIndexedPage = page - 1
  const firstPageOffset = pageSize * zeroIndexedPage

  const ids = request.payload.ids.slice(
    firstPageOffset,
    firstPageOffset + pageSize
  )
  const data = ids
    .map((id) => holdingMap[id])
    .filter((holding) => holding !== undefined)

  const links = {
    self: `${request.path}?${query.toString()}`,
    next:
      firstPageOffset + pageSize < holdings.length
        ? `${request.path}?${movePage(query, 1).toString()}`
        : null,
    prev:
      page !== 1 ? `${request.path}?${movePage(query, -1).toString()}` : null
  }

  const response = {
    data,
    links
  }

  return h.response(response).code(200)
}

export default {
  method: 'POST',
  handler,
  options
}

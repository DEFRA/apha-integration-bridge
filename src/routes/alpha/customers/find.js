import Joi from 'joi'
import fs from 'node:fs'
import path from 'node:path'

import {
  HTTPExceptionSchema,
  HTTPException
} from '../../../lib/http/http-exception.js'

import { all } from './find.mocks.js'
import { memoCustomers, memos } from './find.memos.js'
import { mockFindHandler } from '../helpers/find.js'
import { PaginationSchema } from '../../../types/alpha/pagination.js'
import { PaginatedLink } from '../../../types/alpha/links.js'
import { Customer } from '../../../types/alpha/customers.js'
import { extractMemoContacts } from '../../../lib/memo-extraction/index.js'
import { getMemoExtractionConfig } from '../../../lib/memo-extraction/model.js'
import { runWithMaskingContext } from '../../../lib/pii/index.js'
import { mapWithConcurrency } from '../../../common/helpers/map-with-concurrency.js'

const PostFindCustomersSchema = Joi.object({
  data: Joi.array().items(Customer).required(),
  links: PaginatedLink
})
  .description('Customer Details')
  .label('Find Customer Response')

const PostFindPayloadSchema = Joi.object({
  ids: Joi.array().items(Joi.string()).required().label('Customer ids')
})

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
const options = {
  auth: false,
  tags: ['api', 'customers'],
  description: 'Retrieve customers by ids',
  notes: fs.readFileSync(path.join(import.meta.dirname, 'find.md'), 'utf8'),
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
/**
 * SPIKE (DSFAAP-2993): runs live AH_MEMO contact extraction on each returned
 * customer's synthetic memo. Names are left unmasked here, like every other
 * name on the alpha routes, because the data is invented; the real customers
 * route must mask them.
 *
 * @param {import('../helpers/find.js').MockData[]} customers
 * @param {import('@hapi/hapi').Request} request
 */
const withMemoContacts = (customers, request) =>
  mapWithConcurrency(
    customers,
    getMemoExtractionConfig().maxConcurrency,
    async (customer) => {
      const { memoContacts, diagnostics } = await runWithMaskingContext(
        { shouldMask: false },
        () => extractMemoContacts(memos[customer.id])
      )

      // Counts and timings only: never the memo or the names.
      request.logger.info(
        {
          memoExtraction: {
            customerId: customer.id,
            status: memoContacts.status,
            reasonCode: memoContacts.reasonCode,
            ...diagnostics
          }
        },
        'memo contact extraction'
      )

      return { ...customer, memoContacts }
    }
  )

const handler = mockFindHandler([...all, ...memoCustomers], {
  enrich: withMemoContacts
})

export default {
  method: 'POST',
  handler,
  options
}

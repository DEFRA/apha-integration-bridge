import Joi from 'joi'

import { config } from '../../config.js'

const maxPageSize = config.get('pagination.maxPageSize')

export const PaginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .description('The page number to retrieve'),
  pageSize: Joi.number()
    .integer()
    .min(1)
    .max(maxPageSize)
    .default(50)
    .description('The number of items per page')
})

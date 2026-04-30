import Joi from 'joi'

import { PaginationSchema } from './pagination.js'

export const GetWorkordersSchema = PaginationSchema.keys({
  startActivationDate: Joi.string()
    .isoDate()
    .description('Paginate workorders after or on this start activation date'),
  endActivationDate: Joi.string()
    .isoDate()
    .description('Paginate workorders before this end activation date'),
  startUpdatedDate: Joi.string()
    .isoDate()
    .description('Paginate workorders after or on this start update date'),
  endUpdatedDate: Joi.string()
    .isoDate()
    .description('Paginate workorders before this end update date'),
  country: Joi.string()
    .trim()
    .min(1)
    .valid('england', 'wales', 'scotland')
    .insensitive()
    .default('Scotland')
    .description(
      'Filter workorders by country (allowed: England, Wales, Scotland; default: Scotland)'
    )
}).custom((value, helpers) => {
  const hasActivationDates =
    value.startActivationDate !== undefined ||
    value.endActivationDate !== undefined
  const hasUpdatedDates =
    value.startUpdatedDate !== undefined || value.endUpdatedDate !== undefined

  // Check for mixed date filter types
  if (hasActivationDates && hasUpdatedDates) {
    return helpers.error('any.invalid', {
      message:
        'Cannot use both activation date and update date filters in the same request'
    })
  }

  // Ensure one set of dates is provided
  if (!hasActivationDates && !hasUpdatedDates) {
    return helpers.error('any.invalid', {
      message:
        'Either activation date range (startActivationDate and endActivationDate) or update date range (startUpdatedDate and endUpdatedDate) must be provided'
    })
  }

  // Ensure both dates in a pair are provided
  if (hasActivationDates) {
    if (
      value.startActivationDate === undefined ||
      value.endActivationDate === undefined
    ) {
      return helpers.error('any.invalid', {
        message:
          'Both startActivationDate and endActivationDate must be provided together'
      })
    }
  }

  if (hasUpdatedDates) {
    if (
      value.startUpdatedDate === undefined ||
      value.endUpdatedDate === undefined
    ) {
      return helpers.error('any.invalid', {
        message:
          'Both startUpdatedDate and endUpdatedDate must be provided together'
      })
    }
  }

  return value
})

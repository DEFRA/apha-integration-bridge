import { describe, expect, test } from '@jest/globals'
import { GetWorkordersSchema } from './workorders-get.js'

describe('GetWorkordersSchema', () => {
  test('accepts valid activation date range', () => {
    const result = GetWorkordersSchema.validate({
      startActivationDate: '2024-01-01T00:00:00.000Z',
      endActivationDate: '2024-02-01T00:00:00.000Z',
      page: 1,
      pageSize: 10
    })
    expect(result.error).toBeUndefined()
  })

  test('accepts valid update date range', () => {
    const result = GetWorkordersSchema.validate({
      startUpdatedDate: '2024-01-01T00:00:00.000Z',
      endUpdatedDate: '2024-02-01T00:00:00.000Z',
      page: 1,
      pageSize: 10
    })
    expect(result.error).toBeUndefined()
  })

  test('rejects when both activation and update date filters are provided', () => {
    const result = GetWorkordersSchema.validate({
      startActivationDate: '2024-01-01T00:00:00.000Z',
      endActivationDate: '2024-02-01T00:00:00.000Z',
      startUpdatedDate: '2024-01-01T00:00:00.000Z',
      endUpdatedDate: '2024-02-01T00:00:00.000Z',
      page: 1,
      pageSize: 10
    })
    expect(result.error).toBeDefined()
    expect(result.error.details[0].context.message).toBe(
      'Cannot use both activation date and update date filters in the same request'
    )
  })

  test('rejects when only one date parameter is provided', () => {
    const result = GetWorkordersSchema.validate({
      startActivationDate: '2024-01-01T00:00:00.000Z',
      page: 1,
      pageSize: 10
    })
    expect(result.error).toBeDefined()
    expect(result.error.details[0].context.message).toBe(
      'Both startActivationDate and endActivationDate must be provided together'
    )
  })

  test('rejects when end date is not after start date', () => {
    const result = GetWorkordersSchema.validate({
      startActivationDate: '2024-02-01T00:00:00.000Z',
      endActivationDate: '2024-01-01T00:00:00.000Z',
      page: 1,
      pageSize: 10
    })
    expect(result.error).toBeDefined()
    expect(result.error.details[0].context.message).toBe(
      'End activation date must be after start activation date'
    )
  })

  test('rejects when no date filters are provided', () => {
    const result = GetWorkordersSchema.validate({
      page: 1,
      pageSize: 10
    })
    expect(result.error).toBeDefined()
    expect(result.error.details[0].context.message).toBe(
      'Either activation date range (startActivationDate and endActivationDate) or update date range (startUpdatedDate and endUpdatedDate) must be provided'
    )
  })

  test('defaults country to Scotland when omitted', () => {
    const result = GetWorkordersSchema.validate({
      startActivationDate: '2024-01-01T00:00:00.000Z',
      endActivationDate: '2024-02-01T00:00:00.000Z',
      page: 1,
      pageSize: 10
    })
    expect(result.error).toBeUndefined()
    expect(result.value.country).toBe('Scotland')
  })
})

import { expect, describe, test } from '@jest/globals'
import { relationshipToMany, relationshipToOne } from './relationships.js'

describe('relationshipToOne', () => {
  const schema = relationshipToOne({
    plural: 'customers',
    singular: 'customer'
  })

  test('should require a data field', () => {
    const result = schema.validate({})
    expect(result.error).toBeDefined()
  })

  test('should accept a null `data` field', () => {
    const result = schema.validate({
      data: null
    })
    expect(result.error).toBeUndefined()
  })

  test('should accept a `data` field with proper type & id', () => {
    const result = schema.validate({
      data: {
        type: 'customers',
        id: 'C1234'
      }
    })
    expect(result.error).toBeUndefined()
  })

  test('should error of plural is not used for data.type', () => {
    const result = schema.validate({
      data: {
        type: 'customer',
        id: 'C1234'
      }
    })
    expect(result.error).toBeDefined()
  })

  test('should error if id is missing', () => {
    const result = schema.validate({
      data: {
        type: 'customer'
      }
    })
    expect(result.error).toBeDefined()
  })

  test('should error if id is null', () => {
    const result = schema.validate({
      data: {
        type: 'customer',
        id: null
      }
    })
    expect(result.error).toBeDefined()
  })

  test('should error if type is missing', () => {
    const result = schema.validate({
      data: {
        id: 'C1234'
      }
    })
    expect(result.error).toBeDefined()
  })

  test('should error if type is null', () => {
    const result = schema.validate({
      data: {
        type: null,
        id: 'C1234'
      }
    })
    expect(result.error).toBeDefined()
  })

  test('should label `data.type` with singular label', () => {
    const description = schema.extract('data').extract('type').describe()
    expect(description.flags.label).toBe('Customer type')
  })

  test('should label `data.id` with singular label', () => {
    const description = schema.extract('data').extract('id').describe()
    expect(description.flags.label).toBe('Customer ID')
  })
})

describe('relationshipToMany', () => {
  const schema = relationshipToMany({
    plural: 'customers',
    singular: 'customer'
  })

  test('should require a data field', () => {
    const result = schema.validate({})
    expect(result.error).toBeDefined()
  })

  test('should accept an empty array `data` field', () => {
    const result = schema.validate({
      data: []
    })
    expect(result.error).toBeUndefined()
  })

  test('should accept objects with `data` fields with proper type & id', () => {
    const result = schema.validate({
      data: [
        {
          type: 'customers',
          id: 'C1234'
        },
        {
          type: 'customers',
          id: 'C4567'
        }
      ]
    })
    expect(result.error).toBeUndefined()
  })

  test('should error of plural is not used for data.type', () => {
    const result = schema.validate({
      data: [
        {
          type: 'customer',
          id: 'C1234'
        }
      ]
    })
    expect(result.error).toBeDefined()
  })

  test('should error if id is missing', () => {
    const result = schema.validate({
      data: [
        {
          type: 'customer'
        }
      ]
    })
    expect(result.error).toBeDefined()
  })

  test('should error if id is null', () => {
    const result = schema.validate({
      data: [
        {
          type: 'customer',
          id: null
        }
      ]
    })
    expect(result.error).toBeDefined()
  })

  test('should error if type is missing', () => {
    const result = schema.validate({
      data: [
        {
          id: 'C1234'
        }
      ]
    })
    expect(result.error).toBeDefined()
  })

  test('should error if type is null', () => {
    const result = schema.validate({
      data: [
        {
          type: null,
          id: 'C1234'
        }
      ]
    })
    expect(result.error).toBeDefined()
  })
})

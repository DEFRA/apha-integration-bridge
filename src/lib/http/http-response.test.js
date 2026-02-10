import { describe, test, expect } from '@jest/globals'
import Joi from 'joi'
import { HTTPObjectResponse, HTTPArrayResponse } from './http-response.js'
import { ActivitiesData } from '../../types/activities.js'
import { CaseManagementUser } from '../../types/case-management-users.js'
import { CommoditiesData } from '../../types/commodities.js'
import { CustomersData } from '../../types/customers.js'
import { FacilitiesData } from '../../types/facilities.js'
import { Holdings } from '../../types/holdings.js'
import { Locations, LocationsData } from '../../types/locations.js'

const schemaFor = (type) =>
  Joi.object({
    type: Joi.string().valid(type).required(),
    id: Joi.any().required()
  }).meta({ response: { type } })

const MissingMetaSchema = Joi.object({
  type: Joi.string().required(),
  id: Joi.string().required()
})

describe('HTTPObjectResponse', () => {
  test('constructor requires a Joi schema', () => {
    expect(() => new HTTPObjectResponse(null, 'id', {})).toThrow(TypeError)
    expect(() => new HTTPObjectResponse(null, 'id', {})).toThrow(
      'Schema must be a Joi schema'
    )
    expect(() => new HTTPArrayResponse(null)).toThrow(TypeError)
    expect(() => new HTTPArrayResponse(null)).toThrow(
      'Schema must be a Joi schema'
    )
  })

  test('constructor requires schema meta response.type', () => {
    expect(() => new HTTPObjectResponse(MissingMetaSchema, 'id', {})).toThrow(
      'Schema meta must include response.type'
    )
    expect(() => new HTTPArrayResponse(MissingMetaSchema)).toThrow(
      'Schema meta must include response.type'
    )
  })

  test('HTTPObjectResponse derives type from schema meta', () => {
    const response = new HTTPObjectResponse(schemaFor('widgets'), 'w1', {})
    expect(response.toResponse().data.type).toBe('widgets')
  })

  test.each([
    ['activities', ActivitiesData],
    ['case-management-user', CaseManagementUser],
    ['commodities', CommoditiesData],
    ['customers', CustomersData],
    ['facilities', FacilitiesData],
    ['holdings', Holdings],
    ['locations', Locations],
    ['locations', LocationsData]
  ])('schema for %s exposes response.type meta', (expectedType, schema) => {
    const response = new HTTPObjectResponse(schema, 'id', {})
    expect(response.type).toBe(expectedType)
  })

  test('extractResponseType resolves the first valid response meta entry', () => {
    const schema = Joi.object({
      type: Joi.string().valid('widgets').required(),
      id: Joi.string().required()
    })
      .meta({ foo: 'bar' })
      .meta({ response: { type: 'widgets' } })

    const response = new HTTPObjectResponse(schema, 'w1', {})

    expect(response.type).toBe('widgets')
  })

  test('should correctly assign type, id, and data', () => {
    const type = 'card'
    const id = 'abc123'
    const data = { name: 'Pikachu', power: 9001 }

    const response = new HTTPObjectResponse(schemaFor(type), id, data)

    // internal fields (mirrors original style)
    expect(response.type).toBe(type)
    expect(response.id).toBe(id)
    expect(response.data).toEqual(data)
  })

  test('toResponse() should return properly structured object and omit empty relationships', () => {
    const response = new HTTPObjectResponse(schemaFor('user'), 42, {
      username: 'alice'
    })

    expect(response.toResponse()).toEqual({
      data: {
        type: 'user',
        id: 42,
        username: 'alice'
      }
    })
  })

  test('should handle null data by omitting attributes (no relationships key)', () => {
    const response = new HTTPObjectResponse(schemaFor('item'), 'xyz', null)

    expect(response.toResponse()).toEqual({
      data: {
        type: 'item',
        id: 'xyz'
      }
    })
  })

  test('should handle undefined id and data', () => {
    const response = new HTTPObjectResponse(
      schemaFor('thing'),
      undefined,
      undefined
    )

    expect(response.toResponse()).toEqual({
      data: {
        type: 'thing',
        id: undefined
      }
    })
  })

  test('links() sets top-level links and is chainable', () => {
    const response = new HTTPObjectResponse(schemaFor('user'), 42, {
      username: 'alice'
    })

    expect(response.links({ next: '/users?page=2' })).toBe(response)
    expect(response.toResponse()).toEqual({
      data: {
        type: 'user',
        id: 42,
        username: 'alice'
      },
      links: { next: '/users?page=2' }
    })
  })

  test('relationship() requires HTTPObjectResponse and is chainable', () => {
    const a = new HTTPObjectResponse(schemaFor('a'), 1, { name: 'A' })
    const b = new HTTPObjectResponse(schemaFor('b'), 2, { name: 'B' })

    // chainable
    expect(a.relationship('b', b)).toBe(a)

    // validation
    expect(() => a.relationship('b', { type: 'b', id: 3 })).toThrow(TypeError)
    expect(() => a.relationship('b', { type: 'b', id: 3 })).toThrow(
      'Response must be an instance of HTTPObjectResponse'
    )
  })

  test('relationship(): single related item serializes as object (not array) and includes full toResponse wrapper', () => {
    const user = new HTTPObjectResponse(schemaFor('user'), 1, {
      username: 'alice'
    })
    const org = new HTTPObjectResponse(schemaFor('org'), 'o1', { name: 'Acme' })

    user.relationship('org', org)

    const out = user.toResponse()
    expect(Array.isArray(out.data.relationships.org)).toBe(false)
    expect(out.data.relationships.org).toEqual({
      data: { type: 'org', id: 'o1', name: 'Acme' }
    })
  })

  test('relationship(): multiple of the same type serialize as an array (in insertion order), each a full wrapper', () => {
    const user = new HTTPObjectResponse(schemaFor('user'), 1, {
      username: 'alice'
    })
    const org1 = new HTTPObjectResponse(schemaFor('org'), 'o1', {
      name: 'Acme'
    })
    const org2 = new HTTPObjectResponse(schemaFor('org'), 'o2', {
      name: 'Beta'
    })

    user.relationship('org', org1).relationship('org', org2)

    const out = user.toResponse()
    expect(Array.isArray(out.data.relationships.org)).toBe(true)
    expect(out.data.relationships.org).toEqual([
      { data: { type: 'org', id: 'o1', name: 'Acme' } },
      { data: { type: 'org', id: 'o2', name: 'Beta' } }
    ])
  })

  test('relationship(): adding same type+id replaces existing (last write wins)', () => {
    const user = new HTTPObjectResponse(schemaFor('user'), 1, {
      username: 'alice'
    })

    const original = new HTTPObjectResponse(schemaFor('org'), 'o1', {
      name: 'OldCo'
    })
    const updated = new HTTPObjectResponse(schemaFor('org'), 'o1', {
      name: 'NewCo'
    })

    user.relationship('org', original).relationship('org', updated)

    const out = user.toResponse()
    // With a single item for this type, it should serialize as an object (full wrapper)
    expect(out.data.relationships.org).toEqual({
      data: { type: 'org', id: 'o1', name: 'NewCo' }
    })
  })

  test('relationship(): supports multiple different relationship types simultaneously', () => {
    const user = new HTTPObjectResponse(schemaFor('user'), 1, {
      username: 'alice'
    })
    const org = new HTTPObjectResponse(schemaFor('org'), 'o1', { name: 'Acme' })
    const role = new HTTPObjectResponse(schemaFor('role'), 'r1', {
      title: 'Admin'
    })

    user.relationship('org', org).relationship('role', role)

    const out = user.toResponse()
    expect(out.data.relationships).toEqual({
      org: { data: { type: 'org', id: 'o1', name: 'Acme' } },
      role: { data: { type: 'role', id: 'r1', title: 'Admin' } }
    })
  })

  test('data cannot override type or id (explicit fields win)', () => {
    const response = new HTTPObjectResponse(schemaFor('realType'), 123, {
      type: 'fakeType',
      id: 'fakeId',
      hello: 'world'
    })

    expect(response.toResponse()).toEqual({
      data: {
        hello: 'world',
        type: 'realType',
        id: 123
      }
    })
  })

  test('nested relationships are serialized recursively (each as full wrapper)', () => {
    const user = new HTTPObjectResponse(schemaFor('user'), 1, {
      username: 'alice'
    })
    const org = new HTTPObjectResponse(schemaFor('org'), 'o1', { name: 'Acme' })
    const parent = new HTTPObjectResponse(schemaFor('org'), 'p1', {
      name: 'Acme Holdings'
    })

    org.relationship('org', parent) // org -> parent
    user.relationship('org', org) // user -> org

    const out = user.toResponse()
    expect(out).toEqual({
      data: {
        type: 'user',
        id: 1,
        username: 'alice',
        relationships: {
          org: {
            data: {
              type: 'org',
              id: 'o1',
              name: 'Acme',
              relationships: {
                org: {
                  data: {
                    type: 'org',
                    id: 'p1',
                    name: 'Acme Holdings'
                  }
                }
              }
            }
          }
        }
      }
    })
  })

  test('toResponse() throws when a relationship response includes links', () => {
    const user = new HTTPObjectResponse(schemaFor('user'), 1, {
      username: 'alice'
    })

    const org = new HTTPObjectResponse(schemaFor('org'), 'o1', {
      name: 'Acme'
    }).links({
      next: '/orgs?page=2'
    })

    user.relationship('org', org)

    expect(() => user.toResponse()).toThrow(
      'Links are only supported on top-level responses'
    )
  })

  test('toResponse() uses schema to emit missing relationships as null/[]', () => {
    const WidgetSchema = Joi.object({
      type: Joi.string().valid('widgets').required(),
      id: Joi.string().required(),
      relationships: Joi.object({
        owner: Joi.object({
          data: Joi.object({
            type: Joi.string().valid('users').required(),
            id: Joi.string().required()
          })
            .allow(null)
            .required()
        }).required(),
        tags: Joi.object({
          data: Joi.array()
            .items(
              Joi.object({
                type: Joi.string().valid('tags').required(),
                id: Joi.string().required()
              })
            )
            .required()
        }).required()
      }).required()
    }).meta({ response: { type: 'widgets' } })

    const response = new HTTPObjectResponse(WidgetSchema, 'w1', {})

    expect(response.toResponse()).toEqual({
      data: {
        type: 'widgets',
        id: 'w1',
        relationships: {
          owner: { data: null },
          tags: { data: [] }
        }
      }
    })
  })

  test('schema plural relationships always serialize as arrays', () => {
    const WidgetSchema = Joi.object({
      type: Joi.string().valid('widgets').required(),
      id: Joi.string().required(),
      relationships: Joi.object({
        tags: Joi.object({
          data: Joi.array()
            .items(
              Joi.object({
                type: Joi.string().valid('tags').required(),
                id: Joi.string().required()
              })
            )
            .required()
        }).required()
      }).required()
    }).meta({ response: { type: 'widgets' } })

    const response = new HTTPObjectResponse(WidgetSchema, 'w2', {})

    response.relationship(
      'tags',
      new HTTPObjectResponse(schemaFor('tags'), 't1', {})
    )

    expect(response.toResponse().data.relationships.tags).toEqual({
      data: [{ type: 'tags', id: 't1' }]
    })
  })

  test('schema single relationships use the first added item when multiple are provided', () => {
    const WidgetSchema = Joi.object({
      type: Joi.string().valid('widgets').required(),
      id: Joi.string().required(),
      relationships: Joi.object({
        owner: Joi.object({
          data: Joi.object({
            type: Joi.string().valid('users').required(),
            id: Joi.string().required()
          })
            .allow(null)
            .required()
        }).required()
      }).required()
    }).meta({ response: { type: 'widgets' } })

    const response = new HTTPObjectResponse(WidgetSchema, 'w3', {})
    const first = new HTTPObjectResponse(schemaFor('users'), 'u1', {})
    const second = new HTTPObjectResponse(schemaFor('users'), 'u2', {})

    response.relationship('owner', first).relationship('owner', second)

    expect(response.toResponse().data.relationships.owner).toEqual({
      data: { type: 'users', id: 'u1' }
    })
  })
})

describe('HTTPArrayResponse', () => {
  test('HTTPArrayResponse derives type for added items', () => {
    const response = new HTTPArrayResponse(schemaFor('widgets'))

    response.add('w1', {})

    expect(response.toResponse()).toEqual({
      data: [{ type: 'widgets', id: 'w1' }]
    })
  })

  test('should build an array response from added items', () => {
    const res = new HTTPArrayResponse(schemaFor('user'))
      .add(1, { username: 'alice' })
      .add(2, { username: 'bob' })

    expect(res.toResponse()).toEqual({
      data: [
        { type: 'user', id: 1, username: 'alice' },
        { type: 'user', id: 2, username: 'bob' }
      ]
    })
  })

  test('adding same id should replace the item (last write wins), position unchanged', () => {
    const res = new HTTPArrayResponse(schemaFor('user'))
      .add(1, { username: 'alice' })
      .add(1, { username: 'alice-updated' })

    expect(res.toResponse()).toEqual({
      data: [{ type: 'user', id: 1, username: 'alice-updated' }]
    })
  })

  test('should handle null data on items by omitting attributes (no empty relationships key)', () => {
    const res = new HTTPArrayResponse(schemaFor('item'))
      .add('a', null)
      .add('b', { name: 'Beta' })

    expect(res.toResponse()).toEqual({
      data: [
        { type: 'item', id: 'a' },
        { type: 'item', id: 'b', name: 'Beta' }
      ]
    })
  })

  test('remove(id) should delete an item', () => {
    const res = new HTTPArrayResponse(schemaFor('thing'))
      .add('x', { value: 1 })
      .add('y', { value: 2 })

    res.remove('x')

    expect(res.toResponse()).toEqual({
      data: [{ type: 'thing', id: 'y', value: 2 }]
    })
  })

  test('links() sets array-level links and is chainable', () => {
    const res = new HTTPArrayResponse(schemaFor('user'))
      .links({ next: '/users?page=2' })
      .add(1, { username: 'alice' })

    expect(res.toResponse()).toEqual({
      data: [{ type: 'user', id: 1, username: 'alice' }],
      links: { next: '/users?page=2' }
    })
  })

  test('empty array response omits links when not set', () => {
    const empty = new HTTPArrayResponse(schemaFor('user'))
    expect(empty.toResponse()).toEqual({ data: [] })
  })

  test('items can include their own nested relationships (wrappers preserved inside relationships)', () => {
    const post = new HTTPObjectResponse(schemaFor('post'), 10, {
      title: 'Hello'
    })
    const author = new HTTPObjectResponse(schemaFor('user'), 1, {
      username: 'alice'
    })
    const org = new HTTPObjectResponse(schemaFor('org'), 'o1', { name: 'Acme' })

    author.relationship('org', org)
    post.relationship('user', author)

    const list = new HTTPArrayResponse(schemaFor('post')).add(post)

    expect(list.toResponse()).toEqual({
      data: [
        {
          type: 'post',
          id: 10,
          title: 'Hello',
          relationships: {
            user: {
              data: {
                type: 'user',
                id: 1,
                username: 'alice',
                relationships: {
                  org: {
                    data: { type: 'org', id: 'o1', name: 'Acme' }
                  }
                }
              }
            }
          }
        }
      ]
    })
  })

  test('array response throws when an item includes links', () => {
    const item = new HTTPObjectResponse(schemaFor('user'), 1, {
      username: 'alice'
    }).links({ self: '/users/1' })
    const list = new HTTPArrayResponse(schemaFor('user')).add(item)

    expect(() => list.toResponse()).toThrow(
      'Links are only supported on top-level responses'
    )
  })

  test('add() and remove() are chainable', () => {
    const list = new HTTPArrayResponse(schemaFor('x'))

    expect(list.add('a', {})).toBe(list)
    expect(list.add('b', {}).remove('a')).toBe(list)
    expect(list.toResponse()).toEqual({
      data: [{ type: 'x', id: 'b' }]
    })
  })

  test('toResponse() is idempotent (does not mutate internal state)', () => {
    const list = new HTTPArrayResponse(schemaFor('user'))
      .add(1, { username: 'alice' })
      .add(2, { username: 'bob' })

    const first = list.toResponse()
    const second = list.toResponse()

    expect(first).toEqual(second)
    // Sanity check on internal Map size in the spirit of the original tests
    expect(list.items.size).toBe(2)
  })
})

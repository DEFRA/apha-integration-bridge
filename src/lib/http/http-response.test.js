import { describe, test, expect } from '@jest/globals'
import Joi from 'joi'
import { HTTPObjectResponse, HTTPArrayResponse } from './http-response.js'

const BaseSchema = Joi.object({
  type: Joi.string().required(),
  id: Joi.any().required()
})

describe('HTTPObjectResponse', () => {
  test('constructor requires a Joi schema', () => {
    expect(() => new HTTPObjectResponse(null, 'user', 1, {})).toThrow(TypeError)
    expect(() => new HTTPObjectResponse(null, 'user', 1, {})).toThrow(
      'Schema must be a Joi schema'
    )
    expect(() =>
      new HTTPObjectResponse(undefined, 'user', 1, {})
    ).toThrow(TypeError)
    expect(() =>
      new HTTPObjectResponse(undefined, 'user', 1, {})
    ).toThrow('Schema must be a Joi schema')
    expect(() => new HTTPObjectResponse({}, 'user', 1, {})).toThrow(TypeError)
    expect(() => new HTTPObjectResponse({}, 'user', 1, {})).toThrow(
      'Schema must be a Joi schema'
    )
  })

  test('should correctly assign type, id, and data', () => {
    const type = 'card'
    const id = 'abc123'
    const data = { name: 'Pikachu', power: 9001 }

    const response = new HTTPObjectResponse(BaseSchema, type, id, data)

    // internal fields (mirrors original style)
    expect(response.type).toBe(type)
    expect(response.id).toBe(id)
    expect(response.data).toEqual(data)
  })

  test('toResponse() should return properly structured object and omit empty relationships', () => {
    const response = new HTTPObjectResponse(BaseSchema, 'user', 42, {
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
    const response = new HTTPObjectResponse(BaseSchema, 'item', 'xyz', null)

    expect(response.toResponse()).toEqual({
      data: {
        type: 'item',
        id: 'xyz'
      }
    })
  })

  test('should handle undefined id and data', () => {
    const response = new HTTPObjectResponse(BaseSchema, 'thing', undefined, undefined)

    expect(response.toResponse()).toEqual({
      data: {
        type: 'thing',
        id: undefined
      }
    })
  })

  test('links() sets top-level links and is chainable', () => {
    const response = new HTTPObjectResponse(BaseSchema, 'user', 42, {
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
    const a = new HTTPObjectResponse(BaseSchema, 'a', 1, { name: 'A' })
    const b = new HTTPObjectResponse(BaseSchema, 'b', 2, { name: 'B' })

    // chainable
    expect(a.relationship('b', b)).toBe(a)

    // validation
    expect(() => a.relationship('b', { type: 'b', id: 3 })).toThrow(TypeError)
    expect(() => a.relationship('b', { type: 'b', id: 3 })).toThrow(
      'Response must be an instance of HTTPObjectResponse'
    )
  })

  test('relationship(): single related item serializes as object (not array) and includes full toResponse wrapper', () => {
    const user = new HTTPObjectResponse(BaseSchema, 'user', 1, { username: 'alice' })
    const org = new HTTPObjectResponse(BaseSchema, 'org', 'o1', { name: 'Acme' })

    user.relationship('org', org)

    const out = user.toResponse()
    expect(Array.isArray(out.data.relationships.org)).toBe(false)
    expect(out.data.relationships.org).toEqual({
      data: { type: 'org', id: 'o1', name: 'Acme' }
    })
  })

  test('relationship(): multiple of the same type serialize as an array (in insertion order), each a full wrapper', () => {
    const user = new HTTPObjectResponse(BaseSchema, 'user', 1, { username: 'alice' })
    const org1 = new HTTPObjectResponse(BaseSchema, 'org', 'o1', { name: 'Acme' })
    const org2 = new HTTPObjectResponse(BaseSchema, 'org', 'o2', { name: 'Beta' })

    user.relationship('org', org1).relationship('org', org2)

    const out = user.toResponse()
    expect(Array.isArray(out.data.relationships.org)).toBe(true)
    expect(out.data.relationships.org).toEqual([
      { data: { type: 'org', id: 'o1', name: 'Acme' } },
      { data: { type: 'org', id: 'o2', name: 'Beta' } }
    ])
  })

  test('relationship(): adding same type+id replaces existing (last write wins)', () => {
    const user = new HTTPObjectResponse(BaseSchema, 'user', 1, { username: 'alice' })

    const original = new HTTPObjectResponse(BaseSchema, 'org', 'o1', {
      name: 'OldCo'
    })
    const updated = new HTTPObjectResponse(BaseSchema, 'org', 'o1', { name: 'NewCo' })

    user.relationship('org', original).relationship('org', updated)

    const out = user.toResponse()
    // With a single item for this type, it should serialize as an object (full wrapper)
    expect(out.data.relationships.org).toEqual({
      data: { type: 'org', id: 'o1', name: 'NewCo' }
    })
  })

  test('relationship(): supports multiple different relationship types simultaneously', () => {
    const user = new HTTPObjectResponse(BaseSchema, 'user', 1, { username: 'alice' })
    const org = new HTTPObjectResponse(BaseSchema, 'org', 'o1', { name: 'Acme' })
    const role = new HTTPObjectResponse(BaseSchema, 'role', 'r1', { title: 'Admin' })

    user.relationship('org', org).relationship('role', role)

    const out = user.toResponse()
    expect(out.data.relationships).toEqual({
      org: { data: { type: 'org', id: 'o1', name: 'Acme' } },
      role: { data: { type: 'role', id: 'r1', title: 'Admin' } }
    })
  })

  test('data cannot override type or id (explicit fields win)', () => {
    const response = new HTTPObjectResponse(BaseSchema, 'realType', 123, {
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
    const user = new HTTPObjectResponse(BaseSchema, 'user', 1, { username: 'alice' })
    const org = new HTTPObjectResponse(BaseSchema, 'org', 'o1', { name: 'Acme' })
    const parent = new HTTPObjectResponse(BaseSchema, 'org', 'p1', {
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
    const user = new HTTPObjectResponse(BaseSchema, 'user', 1, { username: 'alice' })

    const org = new HTTPObjectResponse(BaseSchema, 'org', 'o1', {
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
    })

    const response = new HTTPObjectResponse(WidgetSchema, 'widgets', 'w1', {})

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
    })

    const response = new HTTPObjectResponse(WidgetSchema, 'widgets', 'w2', {})

    response.relationship(
      'tags',
      new HTTPObjectResponse(BaseSchema, 'tags', 't1', {})
    )

    expect(response.toResponse().data.relationships.tags).toEqual({
      data: [{ type: 'tags', id: 't1' }]
    })
  })
})

describe('HTTPArrayResponse', () => {
  test('should build an array response from added HTTPObjectResponse items', () => {
    const res = new HTTPArrayResponse()
      .add(new HTTPObjectResponse(BaseSchema, 'user', 1, { username: 'alice' }))
      .add(new HTTPObjectResponse(BaseSchema, 'user', 2, { username: 'bob' }))

    expect(res.toResponse()).toEqual({
      data: [
        { type: 'user', id: 1, username: 'alice' },
        { type: 'user', id: 2, username: 'bob' }
      ]
    })
  })

  test('add() requires HTTPObjectResponse', () => {
    const res = new HTTPArrayResponse()
    // @ts-expect-error - testing invalid input
    expect(() => res.add({})).toThrow(TypeError)

    // @ts-expect-error - testing invalid input
    expect(() => res.add({})).toThrow(
      'Response must be an instance of HTTPObjectResponse'
    )
  })

  test('adding same id should replace the item (last write wins), position unchanged', () => {
    const res = new HTTPArrayResponse()
      .add(new HTTPObjectResponse(BaseSchema, 'user', 1, { username: 'alice' }))
      .add(
        new HTTPObjectResponse(BaseSchema, 'user', 1, { username: 'alice-updated' })
      )

    expect(res.toResponse()).toEqual({
      data: [{ type: 'user', id: 1, username: 'alice-updated' }]
    })
  })

  test('should handle null data on items by omitting attributes (no empty relationships key)', () => {
    const res = new HTTPArrayResponse()
      .add(new HTTPObjectResponse(BaseSchema, 'item', 'a', null))
      .add(new HTTPObjectResponse(BaseSchema, 'item', 'b', { name: 'Beta' }))

    expect(res.toResponse()).toEqual({
      data: [
        { type: 'item', id: 'a' },
        { type: 'item', id: 'b', name: 'Beta' }
      ]
    })
  })

  test('remove(id) should delete an item', () => {
    const res = new HTTPArrayResponse()
      .add(new HTTPObjectResponse(BaseSchema, 'thing', 'x', { value: 1 }))
      .add(new HTTPObjectResponse(BaseSchema, 'thing', 'y', { value: 2 }))

    res.remove('x')

    expect(res.toResponse()).toEqual({
      data: [{ type: 'thing', id: 'y', value: 2 }]
    })
  })

  test('links() sets array-level links and is chainable', () => {
    const res = new HTTPArrayResponse()
      .links({ next: '/users?page=2' })
      .add(new HTTPObjectResponse(BaseSchema, 'user', 1, { username: 'alice' }))

    expect(res.toResponse()).toEqual({
      data: [{ type: 'user', id: 1, username: 'alice' }],
      links: { next: '/users?page=2' }
    })
  })

  test('empty array response omits links when not set', () => {
    const empty = new HTTPArrayResponse()
    expect(empty.toResponse()).toEqual({ data: [] })
  })

  test('items can include their own nested relationships (wrappers preserved inside relationships)', () => {
    const post = new HTTPObjectResponse(BaseSchema, 'post', 10, { title: 'Hello' })
    const author = new HTTPObjectResponse(BaseSchema, 'user', 1, {
      username: 'alice'
    })
    const org = new HTTPObjectResponse(BaseSchema, 'org', 'o1', { name: 'Acme' })

    author.relationship('org', org)
    post.relationship('user', author)

    const list = new HTTPArrayResponse().add(post)

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

  test('add() and remove() are chainable', () => {
    const list = new HTTPArrayResponse()
    const a = new HTTPObjectResponse(BaseSchema, 'x', 'a', {})
    const b = new HTTPObjectResponse(BaseSchema, 'x', 'b', {})

    expect(list.add(a)).toBe(list)
    expect(list.add(b).remove('a')).toBe(list)
    expect(list.toResponse()).toEqual({
      data: [{ type: 'x', id: 'b' }]
    })
  })

  test('toResponse() is idempotent (does not mutate internal state)', () => {
    const list = new HTTPArrayResponse()
      .add(new HTTPObjectResponse(BaseSchema, 'user', 1, { username: 'alice' }))
      .add(new HTTPObjectResponse(BaseSchema, 'user', 2, { username: 'bob' }))

    const first = list.toResponse()
    const second = list.toResponse()

    expect(first).toEqual(second)
    // Sanity check on internal Map size in the spirit of the original tests
    expect(list.items.size).toBe(2)
  })
})

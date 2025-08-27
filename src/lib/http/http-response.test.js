import { describe, test, expect } from '@jest/globals'
import { HTTPObjectResponse, HTTPArrayResponse } from './http-response.js'

describe('HTTPObjectResponse', () => {
  test('should correctly assign type, id, and attributes', () => {
    const type = 'card'
    const id = 'abc123'
    const attributes = { name: 'Pikachu', power: 9001 }

    const response = new HTTPObjectResponse(type, id, attributes)

    // internal fields (mirrors original style)
    expect(response.type).toBe(type)
    expect(response.id).toBe(id)
    expect(response.attributes).toEqual(attributes)
  })

  test('toResponse() should return properly structured object and include empty relationships', () => {
    const response = new HTTPObjectResponse('user', 42, { username: 'alice' })

    expect(response.toResponse()).toEqual({
      data: {
        type: 'user',
        id: 42,
        username: 'alice',
        relationships: {}
      }
    })
  })

  test('should handle null attributes by omitting them (relationships still present)', () => {
    const response = new HTTPObjectResponse('item', 'xyz', null)

    expect(response.toResponse()).toEqual({
      data: {
        type: 'item',
        id: 'xyz',
        relationships: {}
      }
    })
  })

  test('should handle undefined id and attributes', () => {
    const response = new HTTPObjectResponse('thing', undefined, undefined)

    expect(response.toResponse()).toEqual({
      data: {
        type: 'thing',
        id: undefined,
        relationships: {}
      }
    })
  })

  test('relationship() requires HTTPObjectResponse and is chainable', () => {
    const a = new HTTPObjectResponse('a', 1, { name: 'A' })
    const b = new HTTPObjectResponse('b', 2, { name: 'B' })

    // chainable
    expect(a.relationship(b)).toBe(a)

    // validation
    expect(() => a.relationship({ type: 'b', id: 3 })).toThrow(TypeError)
    expect(() => a.relationship({ type: 'b', id: 3 })).toThrow(
      'Response must be an instance of HTTPObjectResponse'
    )
  })

  test('relationship(): single related item serializes as object (not array)', () => {
    const user = new HTTPObjectResponse('user', 1, { username: 'alice' })
    const org = new HTTPObjectResponse('org', 'o1', { name: 'Acme' })

    user.relationship(org)

    const out = user.toResponse()
    expect(out.data.relationships.org).toEqual({
      type: 'org',
      id: 'o1',
      name: 'Acme',
      relationships: {}
    })
    expect(Array.isArray(out.data.relationships.org)).toBe(false)
  })

  test('relationship(): multiple of the same type serialize as an array (in insertion order)', () => {
    const user = new HTTPObjectResponse('user', 1, { username: 'alice' })
    const org1 = new HTTPObjectResponse('org', 'o1', { name: 'Acme' })
    const org2 = new HTTPObjectResponse('org', 'o2', { name: 'Beta' })

    user.relationship(org1).relationship(org2)

    const out = user.toResponse()
    expect(Array.isArray(out.data.relationships.org)).toBe(true)
    expect(out.data.relationships.org).toEqual([
      { type: 'org', id: 'o1', name: 'Acme', relationships: {} },
      { type: 'org', id: 'o2', name: 'Beta', relationships: {} }
    ])
  })

  test('relationship(): adding same type+id replaces existing (last write wins)', () => {
    const user = new HTTPObjectResponse('user', 1, { username: 'alice' })

    const original = new HTTPObjectResponse('org', 'o1', { name: 'OldCo' })
    const updated = new HTTPObjectResponse('org', 'o1', { name: 'NewCo' })

    user.relationship(original).relationship(updated)

    const out = user.toResponse()
    // With a single item for this type, it should serialize as an object
    expect(out.data.relationships.org).toEqual({
      type: 'org',
      id: 'o1',
      name: 'NewCo',
      relationships: {}
    })
  })

  test('relationship(): supports multiple different relationship types simultaneously', () => {
    const user = new HTTPObjectResponse('user', 1, { username: 'alice' })
    const org = new HTTPObjectResponse('org', 'o1', { name: 'Acme' })
    const role = new HTTPObjectResponse('role', 'r1', { title: 'Admin' })

    user.relationship(org).relationship(role)

    const out = user.toResponse()
    expect(out.data.relationships).toEqual({
      org: { type: 'org', id: 'o1', name: 'Acme', relationships: {} },
      role: { type: 'role', id: 'r1', title: 'Admin', relationships: {} }
    })
  })

  test('attributes cannot override type or id (explicit fields win)', () => {
    const response = new HTTPObjectResponse('realType', 123, {
      type: 'fakeType',
      id: 'fakeId',
      hello: 'world'
    })

    expect(response.toResponse()).toEqual({
      data: {
        hello: 'world',
        type: 'realType',
        id: 123,
        relationships: {}
      }
    })
  })

  test('nested relationships are serialized recursively', () => {
    const user = new HTTPObjectResponse('user', 1, { username: 'alice' })
    const org = new HTTPObjectResponse('org', 'o1', { name: 'Acme' })
    const parent = new HTTPObjectResponse('org', 'p1', {
      name: 'Acme Holdings'
    })

    org.relationship(parent) // org -> parent
    user.relationship(org) // user -> org

    const out = user.toResponse()
    expect(out).toEqual({
      data: {
        type: 'user',
        id: 1,
        username: 'alice',
        relationships: {
          org: {
            type: 'org',
            id: 'o1',
            name: 'Acme',
            relationships: {
              org: {
                type: 'org',
                id: 'p1',
                name: 'Acme Holdings',
                relationships: {}
              }
            }
          }
        }
      }
    })
  })
})

describe('HTTPArrayResponse', () => {
  test('should build an array response from added HTTPObjectResponse items', () => {
    const res = new HTTPArrayResponse()
      .add(new HTTPObjectResponse('user', 1, { username: 'alice' }))
      .add(new HTTPObjectResponse('user', 2, { username: 'bob' }))

    expect(res.toResponse()).toEqual({
      data: [
        { type: 'user', id: 1, username: 'alice', relationships: {} },
        { type: 'user', id: 2, username: 'bob', relationships: {} }
      ]
    })
  })

  test('add() requires HTTPObjectResponse', () => {
    const res = new HTTPArrayResponse()
    // invalid inputs
    expect(() => res.add({})).toThrow(TypeError)
    expect(() => res.add({})).toThrow(
      'Response must be an instance of HTTPObjectResponse'
    )
  })

  test('adding same id should replace the item (last write wins), position unchanged', () => {
    const res = new HTTPArrayResponse()
      .add(new HTTPObjectResponse('user', 1, { username: 'alice' }))
      .add(new HTTPObjectResponse('user', 1, { username: 'alice-updated' }))

    expect(res.toResponse()).toEqual({
      data: [
        { type: 'user', id: 1, username: 'alice-updated', relationships: {} }
      ]
    })
  })

  test('should handle null attributes on items by omitting them (relationships still present)', () => {
    const res = new HTTPArrayResponse()
      .add(new HTTPObjectResponse('item', 'a', null))
      .add(new HTTPObjectResponse('item', 'b', { name: 'Beta' }))

    expect(res.toResponse()).toEqual({
      data: [
        { type: 'item', id: 'a', relationships: {} },
        { type: 'item', id: 'b', name: 'Beta', relationships: {} }
      ]
    })
  })

  test('remove(id) should delete an item', () => {
    const res = new HTTPArrayResponse()
      .add(new HTTPObjectResponse('thing', 'x', { value: 1 }))
      .add(new HTTPObjectResponse('thing', 'y', { value: 2 }))

    res.remove('x')

    expect(res.toResponse()).toEqual({
      data: [{ type: 'thing', id: 'y', value: 2, relationships: {} }]
    })
  })

  test('array-level attributes are included at the top level of the response', () => {
    const res = new HTTPArrayResponse({
      meta: { total: 2 },
      links: { self: '/users' }
    })
      .add(new HTTPObjectResponse('user', 1, { username: 'alice' }))
      .add(new HTTPObjectResponse('user', 2, { username: 'bob' }))

    expect(res.toResponse()).toEqual({
      data: [
        { type: 'user', id: 1, username: 'alice', relationships: {} },
        { type: 'user', id: 2, username: 'bob', relationships: {} }
      ],
      meta: { total: 2 },
      links: { self: '/users' }
    })
  })

  test('empty array response returns { data: [] } with any provided attributes spread', () => {
    const withAttrs = new HTTPArrayResponse({ meta: { total: 0 } })
    expect(withAttrs.toResponse()).toEqual({ data: [], meta: { total: 0 } })

    const noAttrs = new HTTPArrayResponse()
    expect(noAttrs.toResponse()).toEqual({ data: [] })
  })

  test('items can include their own nested relationships', () => {
    const post = new HTTPObjectResponse('post', 10, { title: 'Hello' })
    const author = new HTTPObjectResponse('user', 1, { username: 'alice' })
    const org = new HTTPObjectResponse('org', 'o1', { name: 'Acme' })

    author.relationship(org)
    post.relationship(author)

    const list = new HTTPArrayResponse().add(post)

    expect(list.toResponse()).toEqual({
      data: [
        {
          type: 'post',
          id: 10,
          title: 'Hello',
          relationships: {
            user: {
              type: 'user',
              id: 1,
              username: 'alice',
              relationships: {
                org: { type: 'org', id: 'o1', name: 'Acme', relationships: {} }
              }
            }
          }
        }
      ]
    })
  })

  test('add() and remove() are chainable', () => {
    const list = new HTTPArrayResponse()
    const a = new HTTPObjectResponse('x', 'a', {})
    const b = new HTTPObjectResponse('x', 'b', {})

    expect(list.add(a)).toBe(list)
    expect(list.add(b).remove('a')).toBe(list)
    expect(list.toResponse()).toEqual({
      data: [{ type: 'x', id: 'b', relationships: {} }]
    })
  })

  test('toResponse() is idempotent (does not mutate internal state)', () => {
    const list = new HTTPArrayResponse()
      .add(new HTTPObjectResponse('user', 1, { username: 'alice' }))
      .add(new HTTPObjectResponse('user', 2, { username: 'bob' }))

    const first = list.toResponse()
    const second = list.toResponse()

    expect(first).toEqual(second)
    // Sanity check on internal Map size in the spirit of the original tests
    expect(list.items.size).toBe(2)
  })
})

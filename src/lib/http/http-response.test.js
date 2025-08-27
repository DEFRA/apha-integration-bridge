import { describe, test, expect } from '@jest/globals'
import { HTTPObjectResponse, HTTPArrayResponse } from './http-response.js'

describe('HTTPObjectResponse', () => {
  test('should correctly assign type, id, and data', () => {
    const type = 'card'
    const id = 'abc123'
    const data = { name: 'Pikachu', power: 9001 }

    const response = new HTTPObjectResponse(type, id, data)

    // internal fields (mirrors original style)
    expect(response.type).toBe(type)
    expect(response.id).toBe(id)
    expect(response.data).toEqual(data)
  })

  test('toResponse() should return properly structured object and omit empty relationships', () => {
    const response = new HTTPObjectResponse('user', 42, { username: 'alice' })

    expect(response.toResponse()).toEqual({
      data: {
        type: 'user',
        id: 42,
        username: 'alice'
      },
      links: {}
    })
  })

  test('should handle null data by omitting attributes (no relationships key)', () => {
    const response = new HTTPObjectResponse('item', 'xyz', null)

    expect(response.toResponse()).toEqual({
      data: {
        type: 'item',
        id: 'xyz'
      },
      links: {}
    })
  })

  test('should handle undefined id and data', () => {
    const response = new HTTPObjectResponse('thing', undefined, undefined)

    expect(response.toResponse()).toEqual({
      data: {
        type: 'thing',
        id: undefined
      },
      links: {}
    })
  })

  test('relationship() requires HTTPObjectResponse and is chainable', () => {
    const a = new HTTPObjectResponse('a', 1, { name: 'A' })
    const b = new HTTPObjectResponse('b', 2, { name: 'B' })

    // chainable
    expect(a.relationship('b', b)).toBe(a)

    // validation
    expect(() => a.relationship('b', { type: 'b', id: 3 })).toThrow(TypeError)
    expect(() => a.relationship('b', { type: 'b', id: 3 })).toThrow(
      'Response must be an instance of HTTPObjectResponse'
    )
  })

  test('relationship(): single related item serializes as object (not array) and includes full toResponse wrapper', () => {
    const user = new HTTPObjectResponse('user', 1, { username: 'alice' })
    const org = new HTTPObjectResponse('org', 'o1', { name: 'Acme' })

    user.relationship('org', org)

    const out = user.toResponse()
    expect(Array.isArray(out.data.relationships.org)).toBe(false)
    expect(out.data.relationships.org).toEqual({
      data: { type: 'org', id: 'o1', name: 'Acme' },
      links: {}
    })
  })

  test('relationship(): multiple of the same type serialize as an array (in insertion order), each a full wrapper', () => {
    const user = new HTTPObjectResponse('user', 1, { username: 'alice' })
    const org1 = new HTTPObjectResponse('org', 'o1', { name: 'Acme' })
    const org2 = new HTTPObjectResponse('org', 'o2', { name: 'Beta' })

    user.relationship('org', org1).relationship('org', org2)

    const out = user.toResponse()
    expect(Array.isArray(out.data.relationships.org)).toBe(true)
    expect(out.data.relationships.org).toEqual([
      { data: { type: 'org', id: 'o1', name: 'Acme' }, links: {} },
      { data: { type: 'org', id: 'o2', name: 'Beta' }, links: {} }
    ])
  })

  test('relationship(): adding same type+id replaces existing (last write wins)', () => {
    const user = new HTTPObjectResponse('user', 1, { username: 'alice' })

    const original = new HTTPObjectResponse('org', 'o1', { name: 'OldCo' })
    const updated = new HTTPObjectResponse('org', 'o1', { name: 'NewCo' })

    user.relationship('org', original).relationship('org', updated)

    const out = user.toResponse()
    // With a single item for this type, it should serialize as an object (full wrapper)
    expect(out.data.relationships.org).toEqual({
      data: { type: 'org', id: 'o1', name: 'NewCo' },
      links: {}
    })
  })

  test('relationship(): supports multiple different relationship types simultaneously', () => {
    const user = new HTTPObjectResponse('user', 1, { username: 'alice' })
    const org = new HTTPObjectResponse('org', 'o1', { name: 'Acme' })
    const role = new HTTPObjectResponse('role', 'r1', { title: 'Admin' })

    user.relationship('org', org).relationship('role', role)

    const out = user.toResponse()
    expect(out.data.relationships).toEqual({
      org: { data: { type: 'org', id: 'o1', name: 'Acme' }, links: {} },
      role: { data: { type: 'role', id: 'r1', title: 'Admin' }, links: {} }
    })
  })

  test('data cannot override type or id (explicit fields win)', () => {
    const response = new HTTPObjectResponse('realType', 123, {
      type: 'fakeType',
      id: 'fakeId',
      hello: 'world'
    })

    expect(response.toResponse()).toEqual({
      data: {
        hello: 'world',
        type: 'realType',
        id: 123
      },
      links: {}
    })
  })

  test('nested relationships are serialized recursively (each as full wrapper)', () => {
    const user = new HTTPObjectResponse('user', 1, { username: 'alice' })
    const org = new HTTPObjectResponse('org', 'o1', { name: 'Acme' })
    const parent = new HTTPObjectResponse('org', 'p1', {
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
                  },
                  links: {}
                }
              }
            },
            links: {}
          }
        }
      },
      links: {}
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
        { type: 'user', id: 1, username: 'alice' },
        { type: 'user', id: 2, username: 'bob' }
      ],
      links: {}
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
      data: [{ type: 'user', id: 1, username: 'alice-updated' }],
      links: {}
    })
  })

  test('should handle null data on items by omitting attributes (no empty relationships key)', () => {
    const res = new HTTPArrayResponse()
      .add(new HTTPObjectResponse('item', 'a', null))
      .add(new HTTPObjectResponse('item', 'b', { name: 'Beta' }))

    expect(res.toResponse()).toEqual({
      data: [
        { type: 'item', id: 'a' },
        { type: 'item', id: 'b', name: 'Beta' }
      ],
      links: {}
    })
  })

  test('remove(id) should delete an item', () => {
    const res = new HTTPArrayResponse()
      .add(new HTTPObjectResponse('thing', 'x', { value: 1 }))
      .add(new HTTPObjectResponse('thing', 'y', { value: 2 }))

    res.remove('x')

    expect(res.toResponse()).toEqual({
      data: [{ type: 'thing', id: 'y', value: 2 }],
      links: {}
    })
  })

  test('array-level "links" object is kept as-is at the top level', () => {
    const res = new HTTPArrayResponse({
      meta: { total: 2 },
      links: { self: '/users' }
    })
      .add(new HTTPObjectResponse('user', 1, { username: 'alice' }))
      .add(new HTTPObjectResponse('user', 2, { username: 'bob' }))

    expect(res.toResponse()).toEqual({
      data: [
        { type: 'user', id: 1, username: 'alice' },
        { type: 'user', id: 2, username: 'bob' }
      ],
      // The constructor argument is used verbatim as `links`
      links: { meta: { total: 2 }, links: { self: '/users' } }
    })
  })

  test('empty array response returns { data: [] } with provided object stored under links', () => {
    const withAttrs = new HTTPArrayResponse({ meta: { total: 0 } })
    expect(withAttrs.toResponse()).toEqual({
      data: [],
      links: { meta: { total: 0 } }
    })

    const noAttrs = new HTTPArrayResponse()
    expect(noAttrs.toResponse()).toEqual({ data: [], links: {} })
  })

  test('items can include their own nested relationships (wrappers preserved inside relationships)', () => {
    const post = new HTTPObjectResponse('post', 10, { title: 'Hello' })
    const author = new HTTPObjectResponse('user', 1, { username: 'alice' })
    const org = new HTTPObjectResponse('org', 'o1', { name: 'Acme' })

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
                    data: { type: 'org', id: 'o1', name: 'Acme' },
                    links: {}
                  }
                }
              },
              links: {}
            }
          }
        }
      ],
      links: {}
    })
  })

  test('add() and remove() are chainable', () => {
    const list = new HTTPArrayResponse()
    const a = new HTTPObjectResponse('x', 'a', {})
    const b = new HTTPObjectResponse('x', 'b', {})

    expect(list.add(a)).toBe(list)
    expect(list.add(b).remove('a')).toBe(list)
    expect(list.toResponse()).toEqual({
      data: [{ type: 'x', id: 'b' }],
      links: {}
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

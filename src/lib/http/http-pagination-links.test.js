import { describe, test, expect } from '@jest/globals'

import { HTTPPaginationLinks } from './http-pagination-links.js'

describe('HTTPPaginationLinks', () => {
  test('builds self link and defaults prev/next to null on first page', () => {
    const links = new HTTPPaginationLinks({
      url: 'http://localhost/customers/find?page=1&pageSize=10'
    })

    expect(links.links()).toEqual({
      self: '/customers/find?page=1&pageSize=10',
      prev: null,
      next: null
    })
  })

  test('builds prev link when page is greater than one', () => {
    const links = new HTTPPaginationLinks({
      url: 'http://localhost/customers/find?page=3&pageSize=10&filter=active'
    })

    expect(links.links()).toEqual({
      self: '/customers/find?page=3&pageSize=10&filter=active',
      prev: '/customers/find?page=2&pageSize=10&filter=active',
      next: null
    })
  })

  test('defaults page to 1 when page is missing or invalid', () => {
    const withInvalidPage = new HTTPPaginationLinks({
      url: 'http://localhost/customers/find?page=abc&pageSize=10'
    })
    const withoutPage = new HTTPPaginationLinks({
      url: 'http://localhost/customers/find?pageSize=10'
    })

    expect(withInvalidPage.page).toBe(1)
    expect(withInvalidPage.links()).toEqual({
      self: '/customers/find?page=abc&pageSize=10',
      prev: null,
      next: null
    })

    expect(withoutPage.page).toBe(1)
    expect(withoutPage.links()).toEqual({
      self: '/customers/find?pageSize=10',
      prev: null,
      next: null
    })
  })

  test('setHasMore(true) creates next link preserving existing query params', () => {
    const links = new HTTPPaginationLinks({
      url: 'http://localhost/customers/find?page=2&pageSize=25&filter=active'
    })

    links.setHasMore(true)

    expect(links.links()).toEqual({
      self: '/customers/find?page=2&pageSize=25&filter=active',
      prev: '/customers/find?page=1&pageSize=25&filter=active',
      next: '/customers/find?page=3&pageSize=25&filter=active'
    })
  })

  test('setHasMore(false) leaves next link unset', () => {
    const links = new HTTPPaginationLinks({
      url: 'http://localhost/customers/find?page=2&pageSize=25'
    })

    links.setHasMore(false)

    expect(links.links()).toEqual({
      self: '/customers/find?page=2&pageSize=25',
      prev: '/customers/find?page=1&pageSize=25',
      next: null
    })
  })
})

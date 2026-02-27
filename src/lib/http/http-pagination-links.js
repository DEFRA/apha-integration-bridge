export class HTTPPaginationLinks {
  /**
   * @typedef {import('@hapi/hapi').Request} Request
   * @param {Request} request
   */
  constructor(request) {
    const url = new URL(request.url)

    this.url = url

    this.self = this._link()

    this.page = Number.parseInt(url.searchParams.get('page'), 10)

    if (!Number.isFinite(this.page)) {
      this.page = 1
    }

    if (this.page > 1) {
      this.prev = this._link({ page: this.page - 1 })
    }
  }

  setHasMore(hasMore) {
    this.hasMore = hasMore
  }

  links() {
    const { self, prev, page, hasMore } = this

    const links = { self, prev: prev || null, next: null }

    if (hasMore) {
      links.next = this._link({ page: page + 1 })
    }

    return links
  }

  /**
   * @param {Record<string, unknown>} params
   */
  _link(params = {}) {
    const { url } = this

    const query = this._buildQueryParams(params)

    return `${url.pathname}?${query.toString()}`
  }

  /**
   * @param {Record<string, unknown>} params
   */
  _buildQueryParams(params) {
    const { url } = this

    const clonedQuery = new URLSearchParams(url.searchParams.toString())

    for (const [key, value] of Object.entries(params)) {
      clonedQuery.set(key, String(value))
    }

    return clonedQuery
  }
}

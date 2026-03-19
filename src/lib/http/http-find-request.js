import { HTTPPaginationLinks } from './http-pagination-links.js'
import { HTTPArrayResponse } from './http-response.js'

export class HTTPFindRequest {
  /**
   * @typedef {import('@hapi/hapi').Request} Request
   * @param {Request} request
   * @param {import('joi').Schema} schema
   */
  constructor(request, schema) {
    const { page, pageSize } = request.query

    const payload = /** @type {{ ids: string[] }} */ (request.payload)

    const nextOffset = pageSize * (page - 1) + pageSize

    const distinctIds = [...new Set(payload.ids)]

    this.page = page

    this.pageSize = pageSize

    this.nextOffset = nextOffset

    this.distinctIds = distinctIds

    this.ids = distinctIds.slice(pageSize * (page - 1), nextOffset)

    this.total = 0

    this._links = new HTTPPaginationLinks(request)

    this._response = new HTTPArrayResponse(schema)

    this._response.links(this._links)
  }

  add(id, data) {
    this._response.add(id, data)
    return this
  }

  hasRemainingIds() {
    return this.nextOffset < this.distinctIds.length
  }

  toResponse() {
    this._links.setHasMore(this.hasRemainingIds())
    return this._response.toResponse()
  }
}

/**
 * @typedef {{ id: string, type: string }} MockData

/**
 * @param {MockData[]} mockData
 * @returns {import('@hapi/hapi').Lifecycle.Method}
 */
export const mockFindHandler = (mockData) => async (request, h) => {
  const dataMap = Object.fromEntries(mockData.map((datum) => [datum.id, datum]))
  const { page, pageSize } = request.query
  const query = new URLSearchParams(request.query)

  const zeroIndexedPage = page - 1
  const firstPageOffset = pageSize * zeroIndexedPage

  const ids = request.payload.ids.slice(
    firstPageOffset,
    firstPageOffset + pageSize
  )
  const data = ids.map((id) => dataMap[id]).filter((data) => data !== undefined)

  const links = {
    self: `${request.path}?${query.toString()}`,
    next:
      firstPageOffset + pageSize < mockData.length
        ? `${request.path}?${movePage(query, 1).toString()}`
        : null,
    prev:
      page !== 1 ? `${request.path}?${movePage(query, -1).toString()}` : null
  }

  const response = {
    data,
    links
  }

  return h.response(response).code(200)
}

/**
 * @param {URLSearchParams} query
 * @param {number} moveBy
 */
const movePage = (query, moveBy) => {
  const page = parseInt(query.get('page'))
  const newQuery = new URLSearchParams(query.toString())
  newQuery.set('page', (page + moveBy).toString())
  return newQuery
}

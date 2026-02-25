/**
 * @import {Request} from '@hapi/hapi'
 * @import {TopLevelLinksReference} from '../../types/links.js'
 */

/**
 * @param {number} page
 * @param {number} pageSize
 * @returns {number} The offset for the first item on the page
 */
const getFirstPageOffset = (page, pageSize) => {
  const zeroIndexedPage = page - 1
  return pageSize * zeroIndexedPage
}

/**
 * @param {URLSearchParams} query
 * @param {number} moveBy
 */
const movePage = (query, moveBy) => {
  const page = Number.parseInt(query.get('page'))
  const newQuery = new URLSearchParams(query.toString())
  newQuery.set('page', (page + moveBy).toString())
  return newQuery
}

/**
 * @param {Request} request
 * @param {number} page
 * @param {number} pageSize
 * @param {number} totalLength
 * @return {TopLevelLinksReference} An object containing pagination links
 */
export const buildPaginatedLinks = (request, page, pageSize, totalLength) => {
  const query = new URLSearchParams(request.query)
  const firstPageOffset = getFirstPageOffset(page, pageSize)
  return {
    self: `${request.path}?${query.toString()}`,
    next:
      firstPageOffset + pageSize < totalLength
        ? `${request.path}?${movePage(query, 1).toString()}`
        : null,
    prev: page > 1 ? `${request.path}?${movePage(query, -1).toString()}` : null
  }
}

/**
 * @param {Array<any>} data
 * @param {number} page
 * @param {number} pageSize
 * @returns {Array<any>} A subset of the data for the specified page
 */
export const getDataSubset = (data, page, pageSize) => {
  const firstPageOffset = getFirstPageOffset(page, pageSize)
  return data.slice(firstPageOffset, firstPageOffset + pageSize)
}

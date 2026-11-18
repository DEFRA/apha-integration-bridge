/**
 * Maps `items` through an async `fn` with at most `limit` calls in flight,
 * keeping the results in input order.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
export const mapWithConcurrency = async (items, limit, fn) => {
  /** @type {R[]} */
  const results = new Array(items.length)
  let next = 0

  const worker = async () => {
    while (next < items.length) {
      const index = next++

      results[index] = await fn(items[index], index)
    }
  }

  const workers = Math.max(1, Math.min(limit, items.length))

  await Promise.all(Array.from({ length: workers }, worker))

  return results
}

import { toHolding } from './to-holding.js'

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string[]} ids
 */
export const toHoldings = (rows, ids) => {
  const holdings = new Map()

  for (const row of rows) {
    const mapped = toHolding(row)

    if (!mapped) {
      continue
    }

    if (!holdings.has(mapped.id)) {
      holdings.set(mapped.id, mapped)
    }
  }

  return ids
    .map((id) => holdings.get(id))
    .filter((holding) => holding !== undefined)
}

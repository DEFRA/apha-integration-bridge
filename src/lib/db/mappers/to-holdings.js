import { bySelectedHoldership } from './by-selected-holdership.js'
import { toHolding } from './to-holding.js'

/**
 * Keeps one holding per CPH: for a CPH with several holderships, the selected
 * one, which sorts first.
 *
 * @param {Record<string, unknown>[]} rows
 * @param {string[]} ids
 */
export const toHoldings = (rows, ids) => {
  const holdings = new Map()

  for (const row of rows.toSorted(bySelectedHoldership)) {
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

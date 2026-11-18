import { describe, expect, test } from '@jest/globals'

import { mapWithConcurrency } from './map-with-concurrency.js'

describe('mapWithConcurrency', () => {
  test('keeps input order and never exceeds the limit', async () => {
    let inFlight = 0
    let maxInFlight = 0

    const results = await mapWithConcurrency(
      [30, 10, 20, 5, 15],
      2,
      async (ms, i) => {
        inFlight++
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise((resolve) => setTimeout(resolve, ms))
        inFlight--

        return `${i}:${ms}`
      }
    )

    expect(results).toEqual(['0:30', '1:10', '2:20', '3:5', '4:15'])
    expect(maxInFlight).toBe(2)
  })

  test('returns an empty array for no items', async () => {
    expect(await mapWithConcurrency([], 3, async () => 1)).toEqual([])
  })

  test('rejects if any call rejects', async () => {
    await expect(
      mapWithConcurrency([1, 2], 2, async (n) => {
        if (n === 2) {
          throw new Error('boom')
        }

        return n
      })
    ).rejects.toThrow('boom')
  })
})

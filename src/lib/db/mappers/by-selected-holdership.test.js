import { expect, test } from '@jest/globals'

import { bySelectedHoldership } from './by-selected-holdership.js'

const holdership = (key, from) => ({
  feature_involvement_pk: key,
  feature_involv_from_date: from
})

test('puts the latest holdership first, then the highest key', () => {
  const rows = [
    holdership(3, new Date(2015, 0, 1)),
    holdership(1, new Date(2020, 5, 1)),
    holdership(2, new Date(2020, 5, 1)),
    holdership(4, null)
  ]

  expect(
    rows.toSorted(bySelectedHoldership).map((row) => row.feature_involvement_pk)
  ).toEqual([2, 1, 3, 4])
})

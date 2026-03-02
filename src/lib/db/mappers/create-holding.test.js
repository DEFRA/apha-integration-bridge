import { expect, test } from '@jest/globals'

import { createHolding } from './create-holding.js'

test('createHolding maps a holding row into the holding response skeleton', () => {
  const holding = createHolding(
    {
      la_name: 'LA name'
    },
    'C123456'
  )

  expect(holding).toEqual({
    type: 'holdings',
    id: 'C123456',
    localAuthority: 'LA name',
    relationships: {
      location: {
        data: null
      },
      cphHolder: {
        data: null
      }
    }
  })
})

import { expect, test } from '@jest/globals'

import { createHolding } from './create-holding.js'

test('createHolding maps a holding row into the holding response skeleton', () => {
  const holding = createHolding(
    {
      cph_type: 'PERMANENT',
      la_name: 'LA name'
    },
    'C123456'
  )

  expect(holding).toEqual({
    type: 'holdings',
    id: 'C123456',
    cphType: 'PERMANENT',
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

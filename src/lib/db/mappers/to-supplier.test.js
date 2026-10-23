import { expect, test } from '@jest/globals'

import { runWithMaskingContext } from '../../pii/index.js'
import { toSupplier } from './to-supplier.js'

const row = {
  party_id: 'C2982006',
  party_type: 'PERSON',
  person_title: 'DR',
  person_given_name: 'Sam',
  person_family_name: 'Herriot',
  organisation_name: null
}

test('toSupplier maps the party and both name sets', () => {
  expect(toSupplier(row)).toEqual({
    id: 'C2982006',
    partyType: 'PERSON',
    title: 'DR',
    firstName: 'Sam',
    lastName: 'Herriot',
    organisationName: null
  })
})

test('toSupplier masks the title and the names', () => {
  const supplier = runWithMaskingContext({ shouldMask: true }, () =>
    toSupplier(row)
  )

  expect(supplier).toMatchObject({
    title: '**',
    firstName: '***',
    lastName: 'H*****t'
  })
})

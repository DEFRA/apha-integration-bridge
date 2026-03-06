import { expect, test } from '@jest/globals'

import { createOrganisation } from './create-organisation.js'

test('createOrganisation maps an organisation row into the response skeleton', () => {
  const organisation = createOrganisation(
    {
      organisation_name: 'Acme Farms Ltd',
      primary_contact_full_name: 'Jane Contact',
      secondary_contact_full_name: 'John Contact'
    },
    'O123456'
  )

  expect(organisation).toEqual({
    type: 'organisations',
    id: 'O123456',
    organisationName: 'Acme Farms Ltd',
    address: null,
    contactDetails: {
      primaryContact: {
        fullName: 'Jane Contact',
        emailAddress: null,
        phoneNumber: null
      },
      secondaryContact: {
        fullName: 'John Contact',
        emailAddress: null,
        phoneNumber: null
      }
    },
    relationships: {
      srabpiPlants: {
        data: []
      }
    }
  })
})

test('createOrganisation throws if organisation_name is missing', () => {
  expect(() =>
    createOrganisation(
      {
        organisation_name: null,
        primary_contact_full_name: 'Jane Contact',
        secondary_contact_full_name: null
      },
      'O777777'
    )
  ).toThrow(/organisation_name/i)
})

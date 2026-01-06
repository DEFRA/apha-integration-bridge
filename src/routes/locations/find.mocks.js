import { HTTPObjectResponse } from '../../lib/http/http-response.js'

const location1 = new HTTPObjectResponse('locations', 'L123456', {
  type: 'locations',
  id: 'L123456',
  osMapReference: 'SO1234567890',
  address: {
    paonStartNumber: 12,
    paonStartNumberSuffix: null,
    paonEndNumber: null,
    paonEndNumberSuffix: '',
    paonDescription: '',
    saonDescription: '',
    saonStartNumber: null,
    saonStartNumberSuffix: null,
    saonEndNumber: null,
    saonEndNumberSuffix: '',
    street: '',
    locality: null,
    town: '',
    administrativeAreaCounty: '',
    postcode: '',
    countryCode: ''
  }
})

location1.relationship(
  'commodities',
  new HTTPObjectResponse(
    'commodities',
    'U000010',
    {},
    { self: `/locations/${location1.id}/relationships/commodities` }
  )
)

location1.relationship(
  'commodities',
  new HTTPObjectResponse(
    'commodities',
    'U000011',
    {},
    { self: `/locations/${location1.id}/relationships/commodities` }
  )
)

location1.relationship(
  'facilities',
  new HTTPObjectResponse(
    'facilities',
    'F000011',
    {},
    { self: `/locations/${location1.id}/relationships/facilities` }
  )
)

location1.relationship(
  'facilities',
  new HTTPObjectResponse(
    'facilities',
    'F000010',
    {},
    { self: `/locations/${location1.id}/relationships/facilities` }
  )
)

export const all = [location1]

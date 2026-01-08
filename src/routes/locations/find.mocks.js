import { HTTPObjectResponse } from '../../lib/http/http-response.js'

export const commodity1 = new HTTPObjectResponse('commodities', 'U000010', {
  fieldStockNumber: 10
})

export const commodity2 = new HTTPObjectResponse('commodities', 'U000011', {
  fieldStockNumber: 1000
})

export const commodity3 = new HTTPObjectResponse('commodities', 'U000012', {})

export const location1 = new HTTPObjectResponse('locations', 'L123456', {
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
    // DSFAAP-2110
    // > removed because not strictly necessary for WFM
    // administrativeAreaCounty: '',
    postcode: '',
    countryCode: ''
  },
  livestockUnits: [commodity1.toResponse().data]
  // DSFAAP-2110
  // > removed because not strictly necessary for WFM
  // facilities: [
  //   {
  //     type: 'facilities',
  //     id: 'F000010'
  //   },
  //   {
  //     type: 'facilities',
  //     id: 'F000011'
  //   }
  // ]
})

location1.relationship(
  'commodities',
  new HTTPObjectResponse(
    'commodities',
    commodity1.id,
    {},
    { self: `/locations/${location1.id}/relationships/commodities` }
  )
)

// DSFAAP-2110
// > removed because not strictly necessary for WFM
// location1.relationship(
//   'facilities',
//   new HTTPObjectResponse(
//     'facilities',
//     'F000011',
//     {},
//     { self: `/locations/${location1.id}/relationships/facilities` }
//   )
// )

// DSFAAP-2110
// > removed because not strictly necessary for WFM
// location1.relationship(
//   'facilities',
//   new HTTPObjectResponse(
//     'facilities',
//     'F000010',
//     {},
//     { self: `/locations/${location1.id}/relationships/facilities` }
//   )
// )

export const location2 = new HTTPObjectResponse('locations', 'L234567', {
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
    // DSFAAP-2110
    // > removed because not strictly necessary for WFM
    // administrativeAreaCounty: '',
    postcode: '',
    countryCode: ''
  },
  livestockUnits: [commodity2.toResponse().data, commodity3.toResponse().data]
  // DSFAAP-2110
  // > removed because not strictly necessary for WFM
  // facilities: [
  //   {
  //     type: 'facilities',
  //     id: 'F000010'
  //   },
  //   {
  //     type: 'facilities',
  //     id: 'F000011'
  //   }
  // ]
})

location2.relationship(
  'commodities',
  new HTTPObjectResponse(
    'commodities',
    commodity2.id,
    {},
    { self: `/locations/${location2.id}/relationships/commodities` }
  )
)

location2.relationship(
  'commodities',
  new HTTPObjectResponse(
    'commodities',
    commodity2.id,
    {},
    { self: `/locations/${location2.id}/relationships/commodities` }
  )
)

export const all = [location1, location2]

import { HTTPObjectResponse } from '../lib/http/http-response.js'
import { ActivitiesData } from '../types/activities.js'
import { CommoditiesData } from '../types/commodities.js'
import { CustomersData } from '../types/customers.js'
import { FacilitiesData } from '../types/facilities.js'
import { Holdings } from '../types/holdings.js'
import { LocationsData } from '../types/locations.js'
import { Workorders } from '../types/workorders.js'

export const first = new HTTPObjectResponse(Workorders, 'WS-76512', {
  status: 'Open',
  startDate: '2024-01-01T09:00:00+00:00',
  activationDate: '2024-01-05T08:30:00+00:00',
  purpose: 'Initiate Incident Premises Spread Tracing Action',
  workArea: 'Tuberculosis',
  country: 'SCOTLAND',
  businessArea: 'Endemic Notifiable Disease',
  aim: 'Contain / Control / Eradicate Endemic Disease',
  latestActivityCompletionDate: '2024-01-01T12:00:00+00:00',
  phase: 'EXPOSURETRACKING'
})

first.relationship(
  'customer',
  new HTTPObjectResponse(CustomersData, 'C123456', {})
)

first.relationship(
  'holding',
  new HTTPObjectResponse(Holdings, '08/139/0167', {})
)

first.relationship(
  'location',
  new HTTPObjectResponse(LocationsData, 'L123456', {})
)

first.relationship(
  'commodity',
  new HTTPObjectResponse(CommoditiesData, 'U000010', {})
)

first.relationship(
  'activities',
  new HTTPObjectResponse(ActivitiesData, undefined, {})
)

export const second = new HTTPObjectResponse(Workorders, 'WS-76513', {
  status: 'Open',
  startDate: '2024-01-03T09:00:00+00:00',
  activationDate: '2024-01-06T08:30:00+00:00',
  purpose: 'Initiate Incident Premises Spread Tracing Action',
  workArea: 'Tuberculosis',
  country: 'SCOTLAND',
  businessArea: 'Endemic Notifiable Disease',
  aim: 'Contain / Control / Eradicate Endemic Disease',
  latestActivityCompletionDate: '2024-01-01T12:00:00+00:00',
  phase: 'EXPOSURETRACKING'
})

second.relationship(
  'customer',
  new HTTPObjectResponse(CustomersData, 'C123457', {})
)

second.relationship(
  'holding',
  new HTTPObjectResponse(Holdings, '08/139/0168', {})
)

second.relationship(
  'location',
  new HTTPObjectResponse(LocationsData, 'L123457', {})
)

second.relationship(
  'facility',
  new HTTPObjectResponse(FacilitiesData, 'U000030', {})
)

second.relationship(
  'activities',
  new HTTPObjectResponse(ActivitiesData, 'test', {})
)

export const third = new HTTPObjectResponse(Workorders, 'WS-93218', {
  status: 'Open',
  startDate: '2024-03-14T10:15:00+00:00',
  activationDate: '2024-03-16T09:00:00+00:00',
  purpose: 'Implement contact tracing and movement restrictions',
  workArea: 'Avian Influenza',
  country: 'WALES',
  businessArea: 'Exotic Notifiable Disease',
  aim: 'Contain / Control / Eradicate Exotic Disease',
  latestActivityCompletionDate: '2024-03-15T15:20:00+00:00',
  phase: 'EXPOSURETRACKING'
})

third.relationship(
  'customer',
  new HTTPObjectResponse(CustomersData, 'C789654', {})
)

third.relationship(
  'holding',
  new HTTPObjectResponse(Holdings, '12/208/3348', {})
)

third.relationship(
  'location',
  new HTTPObjectResponse(LocationsData, 'L078945', {})
)

third.relationship(
  'commodity',
  new HTTPObjectResponse(CommoditiesData, 'U005321', {})
)

third.relationship(
  'activities',
  new HTTPObjectResponse(ActivitiesData, undefined, {})
)

export const all = [first, second, third]

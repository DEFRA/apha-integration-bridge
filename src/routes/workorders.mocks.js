import { HTTPObjectResponse } from '../lib/http/http-response.js'

export const first = new HTTPObjectResponse('workorders', 'WS-76512', {
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
  new HTTPObjectResponse('customers', 'C123456', {})
)

first.relationship(
  'holding',
  new HTTPObjectResponse('holdings', '08/139/0167', {})
)

first.relationship(
  'location',
  new HTTPObjectResponse('locations', 'L123456', {})
)

first.relationship(
  'commodity',
  new HTTPObjectResponse('commodities', 'U000010', {})
)

first.relationship(
  'activities',
  new HTTPObjectResponse('activities', undefined, {})
)

export const second = new HTTPObjectResponse('workorders', 'WS-76513', {
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
  new HTTPObjectResponse('customers', 'C123457', {})
)

second.relationship(
  'holding',
  new HTTPObjectResponse('holdings', '08/139/0168', {})
)

second.relationship(
  'location',
  new HTTPObjectResponse('locations', 'L123457', {})
)

second.relationship(
  'facility',
  new HTTPObjectResponse('facilities', 'U000030', {})
)

second.relationship(
  'activities',
  new HTTPObjectResponse('activities', 'test', {})
)

export const third = new HTTPObjectResponse('workorders', 'WS-93218', {
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
  new HTTPObjectResponse('customers', 'C789654', {})
)

third.relationship(
  'holding',
  new HTTPObjectResponse('holdings', '12/208/3348', {})
)

third.relationship(
  'location',
  new HTTPObjectResponse('locations', 'L078945', {})
)

third.relationship(
  'commodity',
  new HTTPObjectResponse('commodities', 'U005321', {})
)

third.relationship(
  'activities',
  new HTTPObjectResponse('activities', undefined, {})
)

export const all = [first, second, third]

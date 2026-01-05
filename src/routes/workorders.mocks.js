import { HTTPObjectResponse } from '../lib/http/http-response.js'

export const first = new HTTPObjectResponse('workorders', 'WS-76512', {
  status: 'Open',
  startDate: '2024-01-01T09:00:00+00:00',
  earliestStartDate: '2024-01-01T09:00:00+00:00',
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
  new HTTPObjectResponse(
    'customers',
    'C123456',
    {},
    {
      self: '/workorders/WS-76512/relationships/customer'
    }
  )
)

first.relationship(
  'holding',
  new HTTPObjectResponse(
    'holdings',
    '08/139/0167',
    {},
    {
      self: '/workorders/WS-76512/relationships/holding'
    }
  )
)

first.relationship(
  'location',
  new HTTPObjectResponse(
    'locations',
    'L123456',
    {},
    {
      self: '/workorders/WS-76512/relationships/location'
    }
  )
)

first.relationship(
  'commodity',
  new HTTPObjectResponse(
    'commodities',
    'U000010',
    {},
    {
      self: '/workorders/WS-76512/relationships/commodity'
    }
  )
)

first.relationship(
  'activities',
  new HTTPObjectResponse(
    'activities',
    undefined,
    {},
    {
      self: '/workorders/WS-76512/relationships/activities'
    }
  )
)

export const second = new HTTPObjectResponse('workorders', 'WS-76513', {
  status: 'Open',
  startDate: '2024-01-03T09:00:00+00:00',
  earliestStartDate: '2024-01-01T09:00:00+00:00',
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
  new HTTPObjectResponse(
    'customers',
    'C123457',
    {},
    {
      self: '/workorders/WS-76513/relationships/customer'
    }
  )
)

second.relationship(
  'holding',
  new HTTPObjectResponse(
    'holdings',
    '08/139/0168',
    {},
    {
      self: '/workorders/WS-76513/relationships/holding'
    }
  )
)

second.relationship(
  'location',
  new HTTPObjectResponse(
    'locations',
    'L123457',
    {},
    {
      self: '/workorders/WS-76513/relationships/location'
    }
  )
)

second.relationship(
  'facility',
  new HTTPObjectResponse(
    'facilities',
    'U000030',
    {},
    {
      self: '/workorders/WS-76513/relationships/facility'
    }
  )
)

second.relationship(
  'activities',
  new HTTPObjectResponse(
    'activities',
    'test',
    {},
    {
      self: '/workorders/WS-76513/relationships/activities'
    }
  )
)

export const third = new HTTPObjectResponse('workorders', 'WS-93218', {
  status: 'Open',
  startDate: '2024-03-14T10:15:00+00:00',
  earliestStartDate: '2024-01-01T09:00:00+00:00',
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
  new HTTPObjectResponse(
    'customers',
    'C789654',
    {},
    {
      self: '/workorders/WS-93218/relationships/customer'
    }
  )
)

third.relationship(
  'holding',
  new HTTPObjectResponse(
    'holdings',
    '12/208/3348',
    {},
    {
      self: '/workorders/WS-93218/relationships/holding'
    }
  )
)

third.relationship(
  'location',
  new HTTPObjectResponse(
    'locations',
    'L078945',
    {},
    {
      self: '/workorders/WS-93218/relationships/location'
    }
  )
)

third.relationship(
  'commodity',
  new HTTPObjectResponse(
    'commodities',
    'U005321',
    {},
    {
      self: '/workorders/WS-93218/relationships/commodity'
    }
  )
)

third.relationship(
  'activities',
  new HTTPObjectResponse(
    'activities',
    undefined,
    {},
    {
      self: '/workorders/WS-93218/relationships/activities'
    }
  )
)

export const all = [first, second, third]

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

export const all = [first, second]

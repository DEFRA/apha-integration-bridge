import { HTTPObjectResponse } from '../../lib/http/http-response.js'
import { customer1, customer2 } from './customers/find.mocks.js'
import { holding1, holding2 } from './holdings/find.mocks.js'
import {
  commodity1,
  commodity3,
  location1,
  location2
} from './locations/find.mocks.js'

const activity1 = {
  type: 'activities',
  id: 'WSA00010',
  activityName: 'Arrange Visit',
  default: true
}

const activity2 = {
  type: 'activities',
  id: 'WSA00020',
  activityName: 'Carry Out Visit',
  default: false
}

const activity3 = {
  type: 'activities',
  id: 'WSA00030',
  activityName: 'Capture Sample Details',
  default: true
}

const facility1 = {
  type: 'facilities',
  id: 'U000030'
}

const facility2 = {
  type: 'facilities',
  id: 'U000040'
}

export const workorder1 = new HTTPObjectResponse('workorders', 'WS-76512', {
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
  phase: 'EXPOSURETRACKING',
  activities: [activity1]
})

workorder1.relationship(
  'customer',
  new HTTPObjectResponse(
    'customers',
    customer1.id,
    {},
    {
      self: `/workorders/${workorder1.id}/relationships/customer`
    }
  )
)

workorder1.relationship(
  'holding',
  new HTTPObjectResponse(
    'holdings',
    holding1.id,
    {},
    {
      self: `/workorders/${workorder1.id}/relationships/holding`
    }
  )
)

workorder1.relationship(
  'location',
  new HTTPObjectResponse(
    'locations',
    location1.id,
    {},
    {
      self: `/workorders/${workorder1.id}/relationships/location`
    }
  )
)

workorder1.relationship(
  'commodity',
  new HTTPObjectResponse(
    'commodities',
    commodity1.id,
    {},
    {
      self: `/workorders/${workorder1.id}/relationships/commodity`
    }
  )
)

workorder1.relationship(
  'facilities',
  new HTTPObjectResponse(
    'facilities',
    facility1.id,
    {},
    {
      self: `/workorders/${workorder1.id}/relationships/facilities`
    }
  )
)

workorder1.relationship(
  'facilities',
  new HTTPObjectResponse(
    'facilities',
    facility2.id,
    {},
    {
      self: `/workorders/${workorder1.id}/relationships/facilities`
    }
  )
)

export const workorder2 = new HTTPObjectResponse('workorders', 'WS-76513', {
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
  phase: 'EXPOSURETRACKING',
  activities: [activity2, activity3]
})

workorder2.relationship(
  'holding',
  new HTTPObjectResponse(
    'holdings',
    holding2.id,
    {},
    {
      self: `/workorders/${workorder2.id}/relationships/holding`
    }
  )
)

workorder2.relationship(
  'location',
  new HTTPObjectResponse(
    'locations',
    location2.id,
    {},
    {
      self: `/workorders/${workorder2.id}/relationships/location`
    }
  )
)

workorder2.relationship(
  'commodity',
  new HTTPObjectResponse(
    'commodities',
    commodity3.id,
    {},
    {
      self: `/workorders/${workorder2.id}/relationships/commodity`
    }
  )
)

workorder2.relationship(
  'facilities',
  new HTTPObjectResponse(
    'facilities',
    facility2.id,
    {},
    {
      self: `/workorders/${workorder2.id}/relationships/facilities`
    }
  )
)

workorder2.relationship(
  'customer',
  new HTTPObjectResponse(
    'customers',
    customer2.id,
    {},
    {
      self: `/workorders/${workorder2.id}/relationships/customer`
    }
  )
)

export const all = [workorder1, workorder2]

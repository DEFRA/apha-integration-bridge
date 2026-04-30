import { expect, test } from '@jest/globals'

import { toActivity } from './to-activity.js'

test('toActivity maps populated fields to API activity shape', () => {
  expect(
    toActivity({
      wsa_id: 'ACT-001',
      activity_name: 'Site inspection',
      activity_status: 'Open',
      activitysequencenumber: '12',
      activityrequiredflag: 'true',
      workbasketname: 'Tech'
    })
  ).toEqual({
    type: 'activities',
    id: 'ACT-001',
    activityName: 'Site inspection',
    status: 'Open',
    sequenceNumber: 12,
    performActivity: true,
    workbasket: 'Tech'
  })
})

test('toActivity maps missing and blank values to nullable fields', () => {
  expect(
    toActivity({
      wsa_id: '   ',
      activity_name: null,
      activity_status: null,
      activitysequencenumber: 'abc',
      activityrequiredflag: null,
      workbasketname: '   '
    })
  ).toEqual({
    type: 'activities',
    id: null,
    activityName: null,
    status: null,
    sequenceNumber: null,
    performActivity: false,
    workbasket: null
  })
})

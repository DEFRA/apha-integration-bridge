import { expect, test } from '@jest/globals'

import { toActivity } from './to-activity.js'

test('toActivity maps populated fields to API activity shape', () => {
  expect(
    toActivity({
      wsa_id: 'ACT-001',
      activity_name: 'Site inspection',
      activitysequencenumber: '12'
    })
  ).toEqual({
    type: 'activities',
    id: 'ACT-001',
    activityName: 'Site inspection',
    sequenceNumber: 12
  })
})

test('toActivity maps missing and blank values to nullable fields', () => {
  expect(
    toActivity({
      wsa_id: '   ',
      activity_name: null,
      activitysequencenumber: 'abc'
    })
  ).toEqual({
    type: 'activities',
    id: null,
    activityName: null,
    sequenceNumber: null
  })
})

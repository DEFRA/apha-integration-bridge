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
      workbasketname: 'Tech',
      assigned_to: 'jsmith'
    })
  ).toEqual({
    type: 'activities',
    id: 'ACT-001',
    activityName: 'Site inspection',
    status: 'Open',
    sequenceNumber: 12,
    performActivity: true,
    workbasket: 'Tech',
    assignedTo: 'jsmith'
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
      workbasketname: '   ',
      assigned_to: null
    })
  ).toEqual({
    type: 'activities',
    id: null,
    activityName: null,
    status: null,
    sequenceNumber: null,
    performActivity: false,
    workbasket: null,
    assignedTo: null
  })
})

test('toActivity maps assigned_to to assignedTo when operator is assigned', () => {
  expect(
    toActivity({
      wsa_id: 'ACT-002',
      activity_name: 'Perform TB Test',
      activity_status: 'Open',
      activitysequencenumber: '1',
      activityrequiredflag: 'true',
      workbasketname: 'Vet',
      assigned_to: 'jdoe'
    })
  ).toEqual({
    type: 'activities',
    id: 'ACT-002',
    activityName: 'Perform TB Test',
    status: 'Open',
    sequenceNumber: 1,
    performActivity: true,
    workbasket: 'Vet',
    assignedTo: 'jdoe'
  })
})

test('toActivity handles null assignedTo for unassigned activities', () => {
  expect(
    toActivity({
      wsa_id: 'ACT-003',
      activity_name: 'Review Documents',
      activity_status: 'Open',
      activitysequencenumber: '2',
      activityrequiredflag: 'false',
      workbasketname: 'Admin',
      assigned_to: null
    })
  ).toEqual({
    type: 'activities',
    id: 'ACT-003',
    activityName: 'Review Documents',
    status: 'Open',
    sequenceNumber: 2,
    performActivity: false,
    workbasket: 'Admin',
    assignedTo: null
  })
})

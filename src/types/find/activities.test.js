import { describe, expect, test } from '@jest/globals'

import { Activities } from './activities.js'
import { toActivity } from '../../lib/db/mappers/to-activity.js'

const populatedActivity = {
  type: 'activities',
  id: 'WS-1-ACT1',
  activityName: 'Arrange Visit',
  status: 'Open',
  sequenceNumber: 1,
  performActivity: true,
  workbasket: 'Tech',
  assignedTo: 'jsmith'
}

describe('Activities schema', () => {
  test('accepts a fully populated activity', () => {
    const { error } = Activities.validate(populatedActivity)
    expect(error).toBeUndefined()
  })

  test('accepts a null activityName (nullable source column)', () => {
    const { error } = Activities.validate({
      ...populatedActivity,
      activityName: null
    })
    expect(error).toBeUndefined()
  })

  test('accepts a null sequenceNumber (nullable source column)', () => {
    const { error } = Activities.validate({
      ...populatedActivity,
      sequenceNumber: null
    })
    expect(error).toBeUndefined()
  })

  test('still requires activityName and sequenceNumber keys to be present', () => {
    const { activityName, sequenceNumber, ...withoutFields } = populatedActivity
    const { error } = Activities.validate(withoutFields, { abortEarly: false })

    expect(error).toBeDefined()
    const missingKeys = error?.details.map((detail) => detail.context?.key)
    expect(missingKeys).toEqual(
      expect.arrayContaining(['activityName', 'sequenceNumber'])
    )
  })

  test('validates an activity the mapper produces from a row with a populated id but null name and sequence number', () => {
    // The exact shape that previously triggered a response-validation 500: a
    // real activity (truthy wsa_id, so it clears the push guard) whose actname
    // and activitysequencenumber are null at the source.
    const activity = toActivity({
      wsa_id: 'WS-1-ACT1',
      activity_name: null,
      activity_status: 'Open',
      activitysequencenumber: null,
      activityrequiredflag: 'true',
      workbasketname: 'Tech',
      assigned_to: 'jsmith'
    })

    expect(activity.id).toBe('WS-1-ACT1')
    expect(activity.activityName).toBeNull()
    expect(activity.sequenceNumber).toBeNull()

    const { error } = Activities.validate(activity)
    expect(error).toBeUndefined()
  })
})

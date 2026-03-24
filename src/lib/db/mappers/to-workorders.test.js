import { expect, test } from '@jest/globals'

import { toWorkorders } from './to-workorders.js'

const mockWorkorderRowBase = {
  work_order_id: 'WO123456',
  wsactivationdate: '2024-01-01',
  business_area: 'Animal Health',
  work_area: 'DC',
  country: 'GB',
  aim: 'Surveillance',
  purpose: 'Monitoring',
  wsearliestactivitystartdate: '2024-02-01',
  purpose_species: 'CTT',
  phase: 'Active',
  activity_name: null,
  activitysequencenumber: null,
  wsa_id: null,
  customer_id: 'C001',
  cph: '11/111/1111',
  facility_unit_id: null,
  location_id: 'L001',
  livestock_unit_id: null
}

const emptyCodeMappings = {
  workAreaMapping: [],
  speciesMapping: []
}

test('toWorkorders aggregates multiple activities from rows with same work_order_id', () => {
  const rows = [
    {
      ...mockWorkorderRowBase,
      wsa_id: 'WSA-A',
      activity_name: 'Site Visit',
      activitysequencenumber: 1
    },
    {
      ...mockWorkorderRowBase,
      wsa_id: 'WSA-B',
      activity_name: 'Sample Collection',
      activitysequencenumber: 2
    },
    {
      ...mockWorkorderRowBase,
      wsa_id: 'WSA-C',
      activity_name: 'Lab Testing',
      activitysequencenumber: 3
    }
  ]

  const workorders = toWorkorders(rows, ['WO123456'], emptyCodeMappings)

  expect(workorders).toHaveLength(1)
  expect(workorders[0].id).toBe('WO123456')
  expect(workorders[0].activities).toHaveLength(3)
  expect(workorders[0].activities[0]).toEqual({
    type: 'activities',
    id: 'WSA-A',
    activityName: 'Site Visit',
    sequenceNumber: 1
  })
  expect(workorders[0].activities[1]).toEqual({
    type: 'activities',
    id: 'WSA-B',
    activityName: 'Sample Collection',
    sequenceNumber: 2
  })
  expect(workorders[0].activities[2]).toEqual({
    type: 'activities',
    id: 'WSA-C',
    activityName: 'Lab Testing',
    sequenceNumber: 3
  })
})

test('toWorkorders aggregates multiple facilities from rows with same work_order_id', () => {
  const rows = [
    {
      ...mockWorkorderRowBase,
      facility_unit_id: 'F001'
    },
    {
      ...mockWorkorderRowBase,
      facility_unit_id: 'F002'
    },
    {
      ...mockWorkorderRowBase,
      facility_unit_id: 'F003'
    }
  ]

  const workorders = toWorkorders(rows, ['WO123456'], emptyCodeMappings)

  expect(workorders).toHaveLength(1)
  expect(workorders[0].relationships.facilities.data).toHaveLength(3)
  expect(workorders[0].relationships.facilities.data[0]).toEqual({
    type: 'facilities',
    id: 'F001'
  })
  expect(workorders[0].relationships.facilities.data[1]).toEqual({
    type: 'facilities',
    id: 'F002'
  })
  expect(workorders[0].relationships.facilities.data[2]).toEqual({
    type: 'facilities',
    id: 'F003'
  })
})

test('toWorkorders aggregates multiple livestockUnits from rows with same work_order_id', () => {
  const rows = [
    {
      ...mockWorkorderRowBase,
      livestock_unit_id: 'LU001'
    },
    {
      ...mockWorkorderRowBase,
      livestock_unit_id: 'LU002'
    },
    {
      ...mockWorkorderRowBase,
      livestock_unit_id: 'LU003'
    }
  ]

  const workorders = toWorkorders(rows, ['WO123456'], emptyCodeMappings)

  expect(workorders).toHaveLength(1)
  expect(workorders[0].relationships.livestockUnits.data).toHaveLength(3)
  expect(workorders[0].relationships.livestockUnits.data[0]).toEqual({
    type: 'animal-commodities',
    id: 'LU001'
  })
  expect(workorders[0].relationships.livestockUnits.data[1]).toEqual({
    type: 'animal-commodities',
    id: 'LU002'
  })
  expect(workorders[0].relationships.livestockUnits.data[2]).toEqual({
    type: 'animal-commodities',
    id: 'LU003'
  })
})

test('toWorkorders aggregates activities, facilities and livestockUnits together', () => {
  const rows = [
    {
      ...mockWorkorderRowBase,
      wsa_id: 'WSA-1',
      activity_name: 'Inspection',
      activitysequencenumber: 1,
      facility_unit_id: 'F001',
      livestock_unit_id: 'LU001'
    },
    {
      ...mockWorkorderRowBase,
      wsa_id: 'WSA-2',
      activity_name: 'Testing',
      activitysequencenumber: 2,
      facility_unit_id: 'F002',
      livestock_unit_id: 'LU002'
    }
  ]

  const workorders = toWorkorders(rows, ['WO123456'], emptyCodeMappings)

  expect(workorders).toHaveLength(1)
  expect(workorders[0].activities).toHaveLength(2)
  expect(workorders[0].relationships.facilities.data).toHaveLength(2)
  expect(workorders[0].relationships.livestockUnits.data).toHaveLength(2)

  expect(workorders[0].activities[0].id).toBe('WSA-1')
  expect(workorders[0].activities[1].id).toBe('WSA-2')

  expect(workorders[0].relationships.facilities.data[0].id).toBe('F001')
  expect(workorders[0].relationships.facilities.data[1].id).toBe('F002')

  expect(workorders[0].relationships.livestockUnits.data[0].id).toBe('LU001')
  expect(workorders[0].relationships.livestockUnits.data[1].id).toBe('LU002')
})

test('toWorkorders deduplicates facilities, livestockUnits and activities', () => {
  const rows = [
    {
      ...mockWorkorderRowBase,
      wsa_id: 'ACT-1',
      activity_name: 'Inspection',
      activitysequencenumber: 1,
      facility_unit_id: 'F001',
      livestock_unit_id: 'LU001'
    },
    {
      ...mockWorkorderRowBase,
      wsa_id: 'ACT-1',
      activity_name: 'Inspection',
      activitysequencenumber: 1,
      facility_unit_id: 'F001',
      livestock_unit_id: 'LU001'
    },
    {
      ...mockWorkorderRowBase,
      wsa_id: 'ACT-2',
      activity_name: 'Testing',
      activitysequencenumber: 2,
      facility_unit_id: 'F002',
      livestock_unit_id: 'LU001'
    }
  ]

  const workorders = toWorkorders(rows, ['WO123456'], emptyCodeMappings)

  expect(workorders).toHaveLength(1)
  // Activities, facilities and livestockUnits are deduplicated by ID
  expect(workorders[0].activities).toHaveLength(2)
  expect(workorders[0].relationships.facilities.data).toHaveLength(2)
  expect(workorders[0].relationships.livestockUnits.data).toHaveLength(1)

  expect(workorders[0].activities[0].id).toBe('ACT-1')
  expect(workorders[0].activities[1].id).toBe('ACT-2')

  expect(workorders[0].relationships.facilities.data[0].id).toBe('F001')
  expect(workorders[0].relationships.facilities.data[1].id).toBe('F002')

  expect(workorders[0].relationships.livestockUnits.data[0].id).toBe('LU001')
})

test('toWorkorders returns workorders ordered by requested ids', () => {
  const rows = [
    {
      ...mockWorkorderRowBase,
      work_order_id: 'WO123456'
    },
    {
      ...mockWorkorderRowBase,
      work_order_id: 'WO789012'
    }
  ]

  const workorders = toWorkorders(
    rows,
    ['WO789012', 'WO123456'],
    emptyCodeMappings
  )

  expect(workorders).toHaveLength(2)
  expect(workorders[0].id).toBe('WO789012')
  expect(workorders[1].id).toBe('WO123456')
})

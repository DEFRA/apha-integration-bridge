import { expect, test } from '@jest/globals'

import { toWorkorder } from './to-workorder.js'

test('toWorkorder returns null when work_order_id is missing', () => {
  expect(
    toWorkorder({
      work_order_id: null
    })
  ).toBeNull()
})

test('toWorkorder maps a single row into one workorder resource', () => {
  const workorder = toWorkorder({
    work_order_id: 'WO123456',
    wsactivationdate: '2024-01-01',
    business_area: 'Animal Health',
    work_area: 'Disease Control',
    country: 'GB',
    aim: 'Surveillance',
    purpose: 'Monitoring',
    wsearliestactivitystartdate: '2024-02-01',
    purpose_species: 'Cattle',
    phase: 'Active',
    wsa_id: 'ACT-001',
    activity_name: 'Site Inspection',
    activitysequencenumber: 1,
    customer_id: 'C001',
    cph: '11/111/1111',
    facility_unit_id: 'F001',
    location_id: 'L001',
    livestock_unit_id: 'LU001'
  })

  expect(workorder).toEqual({
    type: 'workorders',
    id: 'WO123456',
    activationDate: '2024-01-01',
    businessArea: 'Animal Health',
    workArea: 'Disease Control',
    country: 'GB',
    aim: 'Surveillance',
    purpose: 'Monitoring',
    earliestActivityStartDate: null, // setting to null as it's not available in the current views
    species: 'Cattle',
    activities: [
      {
        type: 'activities',
        id: 'ACT-001',
        activityName: 'Site Inspection',
        sequenceNumber: 1
      }
    ],
    phase: 'Active',
    relationships: {
      customerOrOrganisation: {
        data: {
          type: 'customers',
          id: 'C001'
        }
      },
      holding: {
        data: {
          type: 'holdings',
          id: '11/111/1111'
        }
      },
      facilities: {
        data: [
          {
            type: 'facilities',
            id: 'F001'
          }
        ]
      },
      location: {
        data: {
          type: 'locations',
          id: 'L001'
        }
      },
      livestockUnits: {
        data: [
          {
            type: 'animal-commodities',
            id: 'LU001'
          }
        ]
      }
    }
  })
})

test('toWorkorder handles rows with minimal data', () => {
  const workorder = toWorkorder({
    work_order_id: 'WO999999',
    wsactivationdate: null,
    business_area: null,
    work_area: null,
    country: null,
    aim: null,
    purpose: null,
    wsearliestactivitystartdate: null,
    purpose_species: null,
    phase: null,
    wsa_id: null,
    activity_name: null,
    activitysequencenumber: null,
    customer_id: null,
    cph: null,
    facility_unit_id: null,
    location_id: null,
    livestock_unit_id: null
  })

  expect(workorder).toEqual({
    type: 'workorders',
    id: 'WO999999',
    activationDate: null,
    businessArea: null,
    workArea: null,
    country: null,
    aim: null,
    purpose: null,
    earliestActivityStartDate: null,
    species: null,
    activities: [],
    phase: null,
    relationships: {
      customerOrOrganisation: {
        data: null
      },
      holding: {
        data: null
      },
      facilities: {
        data: []
      },
      location: {
        data: null
      },
      livestockUnits: {
        data: []
      }
    }
  })
})

import { expect, test } from '@jest/globals'

import { createWorkorder } from './create-workorder.js'

test('createWorkorder maps a workorder row into the workorder response skeleton', () => {
  const workorder = createWorkorder(
    {
      wsactivationdate: '2024-01-15',
      business_area: 'Animal Health',
      work_area: 'Brucellosis (Brucella abortus)',
      country: 'GB',
      aim: 'Surveillance',
      purpose: 'Monitoring',
      wsearliestactivitystartdate: '2024-02-01',
      purpose_species: 'Cattle',
      phase: 'Active'
    },
    'WS12345'
  )

  expect(workorder).toEqual({
    type: 'workorders',
    id: 'WS12345',
    activationDate: '2024-01-15',
    businessArea: 'Animal Health',
    workArea: 'Brucellosis (Brucella abortus)',
    country: 'GB',
    aim: 'Surveillance',
    purpose: 'Monitoring',
    earliestActivityStartDate: '2024-02-01',
    species: 'Cattle',
    activities: [],
    phase: 'Active',
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

test('createWorkorder handles rows with null values', () => {
  const workorder = createWorkorder(
    {
      wsactivationdate: null,
      business_area: null,
      work_area: null,
      country: null,
      aim: null,
      purpose: null,
      wsearliestactivitystartdate: null,
      purpose_species: null,
      phase: null
    },
    'WS12345'
  )

  expect(workorder).toEqual({
    type: 'workorders',
    id: 'WS12345',
    activationDate: null,
    businessArea: null,
    workArea: 'Brucellosis (Brucella abortus)',
    country: null,
    aim: null,
    purpose: null,
    earliestActivityStartDate: null,
    species: 'Cattle',
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

import { expect, test } from '@jest/globals'

import { toWorkorder } from './to-workorder.js'

const validCodeMappings = {
  workAreaMapping: [
    {
      work_area_code: 'DC',
      work_area_desc: 'Disease Control'
    }
  ],
  speciesMapping: [
    {
      purpose_species_code: 'CTT',
      purpose_species_desc: 'Cattle'
    }
  ],
  customerTypeMapping: new Map([['C001', 'PERSON']])
}

const emptyCodeMappings = {
  workAreaMapping: [],
  speciesMapping: [],
  customerTypeMapping: new Map()
}

test('toWorkorder returns null when work_order_id is missing', () => {
  expect(
    toWorkorder(
      {
        work_order_id: null
      },
      emptyCodeMappings
    )
  ).toBeNull()
})

test('toWorkorder maps a single row into one workorder resource, replacing codes with descriptions for work area and species', () => {
  const workorder = toWorkorder(
    {
      work_order_id: 'WO123456',
      wsactivationdate: '2024-01-01',
      target_date: '2024-03-01',
      business_area: 'Animal Health',
      work_area: 'DC',
      country: 'GB',
      aim: 'Surveillance',
      purpose: 'Monitoring',
      wsearliestactivitystartdate: '2024-02-01',
      purpose_species: 'CTT',
      phase: 'Active',
      ws_status: 'Open',
      wsa_id: 'ACT-001',
      activity_name: 'Site Inspection',
      activity_status: 'Pending',
      activitysequencenumber: 1,
      customer_id: 'C001',
      cph: '11/111/1111',
      facility_unit_id: 'F001',
      location_id: 'L001',
      livestock_unit_id: 'LU001'
    },
    validCodeMappings
  )

  expect(workorder).toEqual({
    type: 'workorders',
    id: 'WO123456',
    status: 'Open',
    activationDate: '2024-01-01',
    targetDate: '2024-03-01',
    businessArea: 'Animal Health',
    workArea: 'Disease Control',
    country: 'GB',
    aim: 'Surveillance',
    purpose: 'Monitoring',
    earliestActivityStartDate: '2024-02-01',
    species: 'Cattle',
    activities: [
      {
        type: 'activities',
        id: 'ACT-001',
        activityName: 'Site Inspection',
        status: 'Pending',
        sequenceNumber: 1,
        performActivity: false,
        workbasket: null
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

test('toWorkorder leaves code values in place when no mappings are found for the given codes', () => {
  const workorder = toWorkorder(
    {
      work_order_id: 'WO123456',
      wsactivationdate: '2024-01-01',
      target_date: '2024-03-01',
      business_area: 'Animal Health',
      work_area: 'DC',
      country: 'GB',
      aim: 'Surveillance',
      purpose: 'Monitoring',
      wsearliestactivitystartdate: '2024-02-01',
      purpose_species: 'CTT',
      phase: 'Active',
      wsa_id: 'ACT-001',
      activity_name: 'Site Inspection',
      activitysequencenumber: 1,
      customer_id: 'C001',
      cph: '11/111/1111',
      facility_unit_id: 'F001',
      location_id: 'L001',
      livestock_unit_id: 'LU001'
    },
    emptyCodeMappings
  )

  expect(workorder.workArea).toEqual('DC')
  expect(workorder.species).toEqual('CTT')
})

test('toWorkorder maps customer relationship using resolved customer type mapping', () => {
  const workorder = toWorkorder(
    {
      work_order_id: 'WO765432',
      wsactivationdate: '2024-01-01',
      target_date: '2024-03-01',
      business_area: 'Animal Health',
      work_area: 'DC',
      country: 'GB',
      aim: 'Surveillance',
      purpose: 'Monitoring',
      wsearliestactivitystartdate: '2024-02-01',
      purpose_species: 'CTT',
      phase: 'Active',
      customer_id: 'CORG001'
    },
    {
      ...emptyCodeMappings,
      customerTypeMapping: new Map([['CORG001', 'ORGANISATION']])
    }
  )

  expect(workorder?.relationships.customerOrOrganisation).toEqual({
    data: {
      type: 'organisations',
      id: 'CORG001'
    }
  })
})

test('toWorkorder falls back to customer/organisation id prefixes when mapping is missing', () => {
  const organisationWorkorder = toWorkorder(
    {
      work_order_id: 'WO765433',
      customer_id: 'O123456'
    },
    emptyCodeMappings
  )

  const customerWorkorder = toWorkorder(
    {
      work_order_id: 'WO765434',
      customer_id: 'C789012'
    },
    emptyCodeMappings
  )

  expect(organisationWorkorder?.relationships.customerOrOrganisation).toEqual({
    data: {
      type: 'organisations',
      id: 'O123456'
    }
  })

  expect(customerWorkorder?.relationships.customerOrOrganisation).toEqual({
    data: {
      type: 'customers',
      id: 'C789012'
    }
  })
})

test('toWorkorder handles rows with minimal data', () => {
  const workorder = toWorkorder(
    {
      work_order_id: 'WO999999',
      wsactivationdate: null,
      target_date: null,
      business_area: null,
      work_area: null,
      country: null,
      aim: null,
      purpose: null,
      wsearliestactivitystartdate: null,
      purpose_species: null,
      phase: null,
      ws_status: null,
      wsa_id: null,
      activity_name: null,
      activity_status: null,
      activitysequencenumber: null,
      customer_id: null,
      cph: null,
      facility_unit_id: null,
      location_id: null,
      livestock_unit_id: null
    },
    emptyCodeMappings
  )

  expect(workorder).toEqual({
    type: 'workorders',
    id: 'WO999999',
    activationDate: null,
    targetDate: null,
    businessArea: null,
    workArea: null,
    country: null,
    aim: null,
    purpose: null,
    earliestActivityStartDate: null,
    species: null,
    status: null,
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

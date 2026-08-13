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
      assigned_to: 'jsmith',
      external_reference: 'External',
      supplier_identifier: 'C1189791',
      delivery_partner_identifier: 'DP-1000'
    })
  ).toEqual({
    type: 'activities',
    id: 'ACT-001',
    activityName: 'Site inspection',
    status: 'Open',
    sequenceNumber: 12,
    performActivity: true,
    workbasket: 'Tech',
    assignedTo: 'jsmith',
    externalReference: 'External',
    supplierIdentifier: 'C1189791',
    deliveryPartnerIdentifier: 'DP-1000'
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
    assignedTo: null,
    externalReference: null,
    supplierIdentifier: null,
    deliveryPartnerIdentifier: null
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
    assignedTo: 'jdoe',
    externalReference: null,
    supplierIdentifier: null,
    deliveryPartnerIdentifier: null
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
    assignedTo: null,
    externalReference: null,
    supplierIdentifier: null,
    deliveryPartnerIdentifier: null
  })
})

test('toActivity maps an external OV allocation without a delivery partner', () => {
  // Scotland: work is allocated directly to an external vet, so the assignment
  // carries an operator id rather than the literal 'External', and no Delivery
  // Partner is involved.
  const activity = toActivity({
    wsa_id: 'ACT-004',
    activity_name: 'Perform TB Skin Test',
    activity_status: 'Open',
    activitysequencenumber: '2',
    activityrequiredflag: 'true',
    workbasketname: 'Vet',
    assigned_to: 'jdoe',
    external_reference: 'operator456',
    supplier_identifier: 'C1189791',
    delivery_partner_identifier: null
  })

  expect(activity.externalReference).toBe('operator456')
  expect(activity.supplierIdentifier).toBe('C1189791')
  expect(activity.deliveryPartnerIdentifier).toBeNull()
})

test('toActivity maps a delivery partner with no external supplier assignment', () => {
  const activity = toActivity({
    wsa_id: 'ACT-005',
    activity_name: 'Physical Animal Inspection',
    activity_status: 'Open',
    activitysequencenumber: '3',
    activityrequiredflag: 'true',
    workbasketname: 'Vet',
    assigned_to: 'awilliams',
    external_reference: null,
    supplier_identifier: null,
    delivery_partner_identifier: 'DP-2000'
  })

  expect(activity.externalReference).toBeNull()
  expect(activity.supplierIdentifier).toBeNull()
  expect(activity.deliveryPartnerIdentifier).toBe('DP-2000')
})

test('toActivity maps whitespace-only external supplier values to null', () => {
  // AC3: Oracle stores '' as NULL, so whitespace is the only "empty" value that
  // can reach the mapper from the database.
  const activity = toActivity({
    wsa_id: 'ACT-006',
    activity_name: 'Arrange Visit',
    activity_status: 'Open',
    activitysequencenumber: '1',
    activityrequiredflag: 'true',
    workbasketname: 'Tech',
    assigned_to: 'jsmith',
    external_reference: '   ',
    supplier_identifier: '   ',
    delivery_partner_identifier: '   '
  })

  expect(activity.externalReference).toBeNull()
  expect(activity.supplierIdentifier).toBeNull()
  expect(activity.deliveryPartnerIdentifier).toBeNull()
})

test('toActivity maps empty-string external supplier values to null', () => {
  // Oracle collapses '' to NULL so this cannot arrive from the database, but
  // AC3 names empty values explicitly and the mapper is reachable from other
  // callers, so pin it.
  const activity = toActivity({
    wsa_id: 'ACT-008',
    activity_name: 'Arrange Visit',
    activity_status: 'Open',
    activitysequencenumber: '1',
    activityrequiredflag: 'true',
    workbasketname: 'Tech',
    assigned_to: 'jsmith',
    external_reference: '',
    supplier_identifier: '',
    delivery_partner_identifier: ''
  })

  expect(activity.externalReference).toBeNull()
  expect(activity.supplierIdentifier).toBeNull()
  expect(activity.deliveryPartnerIdentifier).toBeNull()
})

test('toActivity trims surrounding whitespace from external supplier values', () => {
  const activity = toActivity({
    wsa_id: 'ACT-007',
    activity_name: 'Arrange Visit',
    activity_status: 'Open',
    activitysequencenumber: '1',
    activityrequiredflag: 'true',
    workbasketname: 'Tech',
    assigned_to: 'jsmith',
    external_reference: ' External ',
    supplier_identifier: ' C1189791 ',
    delivery_partner_identifier: ' DP-1000 '
  })

  expect(activity.externalReference).toBe('External')
  expect(activity.supplierIdentifier).toBe('C1189791')
  expect(activity.deliveryPartnerIdentifier).toBe('DP-1000')
})

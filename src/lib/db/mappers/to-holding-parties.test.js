import { expect, test } from '@jest/globals'

import { runWithMaskingContext } from '../../pii/index.js'
import {
  toHoldingInvolvements,
  toHoldingParties
} from './to-holding-parties.js'

const holdership = { feature_involvement_pk: 1, feature_pk: 10 }

const involvement = (key, type, partyKey, partyType = 'PERSON') => ({
  involvement_pk: key,
  involvement_type: type,
  location_id: 'L10',
  party_pk: partyKey,
  party_id: `C${partyKey}`,
  party_type: partyType
})

/**
 * the rows of one person, C100, who holds the holdership
 *
 * @param {Record<string, unknown[]>} rows
 */
const partyRows = (rows) => ({
  holderships: [holdership],
  involvements: [involvement(1, 'CPHHOLDERSHIP', 100)],
  roles: [],
  contacts: [],
  addresses: [],
  people: [],
  organisations: [],
  organisationAttributes: [],
  ...rows
})

const masked = (rows) =>
  runWithMaskingContext({ shouldMask: true }, () => toHoldingParties(rows))

test('toHoldingInvolvements keeps holder rows only for the holderships it is given, and every row once', () => {
  const rows = [
    involvement(1, 'CPHHOLDERSHIP', 100),
    // a second current state of the party repeats its rows
    involvement(1, 'CPHHOLDERSHIP', 100),
    // the holdership of another CPH at the same location
    involvement(2, 'CPHHOLDERSHIP', 200),
    involvement(3, 'OWNEROFLOCATION', 300)
  ]

  expect(toHoldingInvolvements([holdership], rows)).toEqual([rows[0], rows[3]])
})

const address = (addressKey, street, preferred = 'N') => ({
  party_pk: 100,
  address_pk: addressKey,
  street,
  preferred_contact_method_ind: preferred
})

test('toHoldingParties leaves every name field null for a party SAM records no current version for, and still lists its addresses', () => {
  const [party] = toHoldingParties(
    partyRows({
      involvements: [involvement(1, 'CPHHOLDERSHIP', 100, null)],
      addresses: [address(1, 'Mill Road')]
    })
  )

  expect(party).toEqual({
    type: 'parties',
    id: 'C100',
    partyType: null,
    title: null,
    firstName: null,
    middleName: null,
    lastName: null,
    organisationName: null,
    organisationType: null,
    namedContacts: null,
    roles: [],
    addresses: [
      {
        primaryAddressableObject: {
          startNumber: null,
          startNumberSuffix: null,
          endNumber: null,
          endNumberSuffix: null,
          description: null
        },
        secondaryAddressableObject: {
          startNumber: null,
          startNumberSuffix: null,
          endNumber: null,
          endNumberSuffix: null,
          description: null
        },
        street: 'Mill Road',
        locality: null,
        town: null,
        county: null,
        postcode: null,
        countryCode: null,
        isPreferred: false,
        ukInternalCode: null
      }
    ],
    contactMethods: [],
    involvements: [
      {
        role: 'holder',
        involvementType: 'CPHHOLDERSHIP',
        locationId: 'L10',
        vetnetCoreId: null,
        livestockUnitId: null,
        status: null,
        lastChecked: null,
        from: null,
        selected: true
      }
    ]
  })
})

test('toHoldingParties leaves the names null for a person stored without a family name, rather than failing', () => {
  const [party] = toHoldingParties(
    partyRows({
      people: [
        {
          party_pk: 100,
          party_id: 'C100',
          customer_type: 'PERSON',
          first_name: 'Ann',
          last_name: '  '
        }
      ]
    })
  )

  expect(party).toMatchObject({ firstName: null, lastName: null })
})

test('toHoldingParties lists an address linked twice once, preferred if either link is, and keeps two that mask alike', () => {
  const [party] = masked(
    partyRows({
      addresses: [
        address(1, 'Mill Road'),
        address(2, 'Moor Road'),
        address(1, 'Mill Road', 'Y')
      ]
    })
  )

  expect(
    party.addresses.map((a) => ({
      street: a.street,
      isPreferred: a.isPreferred
    }))
  ).toEqual([
    { street: 'M*******d', isPreferred: true },
    { street: 'M*******d', isPreferred: false }
  ])
})

test('toHoldingParties lists a mobile linked twice once, preferred if either link is', () => {
  const mobile = (key, value, preferred) => ({
    party_pk: 100,
    party_contact_address_pk: key,
    telecom_address_type: 'MOBILE',
    contact_value: value,
    address_usage_type: 'HOME',
    preferred_contact_method_ind: preferred
  })

  const [party] = masked(
    partyRows({
      contacts: [
        mobile(1, '07700 900101', 'N'),
        mobile(2, '07700 900201', 'N'),
        mobile(3, '07700 900101', 'Y')
      ]
    })
  )

  expect(party.contactMethods).toEqual([
    {
      type: 'mobile',
      phoneNumber: '0**********1',
      isPreferred: true,
      usageType: 'HOME'
    },
    {
      type: 'mobile',
      phoneNumber: '0**********1',
      isPreferred: false,
      usageType: 'HOME'
    }
  ])
})

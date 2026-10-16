import {
  customer3,
  customer4,
  customer5
} from '../../../../customers/find.mocks.js'
import {
  organisation3,
  organisation4
} from '../../../../organisations/find.mocks.js'

const party1 = {
  type: 'parties',
  id: customer3.id,
  partyType: 'PERSON',
  title: customer3.title,
  firstName: customer3.firstName,
  middleName: customer3.middleName,
  lastName: customer3.lastName,
  organisationName: null,
  organisationType: null,
  namedContacts: null,
  roles: customer3.roles,
  addresses: customer3.addresses,
  contactMethods: customer3.contactDetails
}

const party2 = {
  type: 'parties',
  id: organisation3.id,
  partyType: 'ORGANISATION',
  title: null,
  firstName: null,
  middleName: null,
  lastName: null,
  organisationName: organisation3.organisationName,
  organisationType: organisation3.organisationType,
  namedContacts: organisation3.contactDetails,
  roles: organisation3.roles,
  addresses: [{ ...organisation3.address, isPreferred: true }],
  contactMethods: organisation3.contactMethods
}

const party3 = {
  type: 'parties',
  id: customer4.id,
  partyType: 'PERSON',
  title: customer4.title,
  firstName: customer4.firstName,
  middleName: customer4.middleName,
  lastName: customer4.lastName,
  organisationName: null,
  organisationType: null,
  namedContacts: null,
  roles: customer4.roles,
  addresses: customer4.addresses,
  contactMethods: customer4.contactDetails
}

const party4 = {
  type: 'parties',
  id: organisation4.id,
  partyType: 'ORGANISATION',
  title: null,
  firstName: null,
  middleName: null,
  lastName: null,
  organisationName: organisation4.organisationName,
  organisationType: organisation4.organisationType,
  namedContacts: organisation4.contactDetails,
  roles: organisation4.roles,
  addresses: [{ ...organisation4.address, isPreferred: true }],
  contactMethods: organisation4.contactMethods
}

const party5 = {
  type: 'parties',
  id: customer5.id,
  partyType: 'PERSON',
  title: customer5.title,
  firstName: customer5.firstName,
  middleName: customer5.middleName,
  lastName: customer5.lastName,
  organisationName: null,
  organisationType: null,
  namedContacts: null,
  roles: customer5.roles,
  addresses: customer5.addresses,
  contactMethods: customer5.contactDetails
}

// L97339 is held under both 12/345/6789 and 08/139/0167, so its land owner
// and its flock's keeper are involved with both.
const landOwnerOfL97339 = {
  role: 'landOwner',
  involvementType: 'OWNEROFLOCATION',
  locationId: 'L97339',
  vetnetCoreId: null,
  livestockUnitId: null,
  status: 'CONFIRMED',
  lastChecked: '2023-05-01',
  from: '2016-11-01',
  selected: null
}

const keeperOfU000010 = {
  role: 'keeper',
  involvementType: 'PRIMARYKEEPEROF',
  locationId: 'L97339',
  vetnetCoreId: null,
  livestockUnitId: 'U000010',
  status: 'ACTIVE',
  lastChecked: null,
  from: '2019-04-02',
  selected: null
}

export const holdingParties = {
  '12/345/6789': [
    {
      ...party1,
      involvements: [
        {
          role: 'holder',
          involvementType: 'CPHHOLDERSHIP',
          locationId: 'L97339',
          vetnetCoreId: '4471023',
          livestockUnitId: null,
          status: null,
          lastChecked: null,
          from: '2019-04-02',
          selected: true
        },
        keeperOfU000010
      ]
    },
    { ...party2, involvements: [landOwnerOfL97339] }
  ],
  '08/139/0167': [
    {
      ...party4,
      involvements: [
        {
          role: 'holder',
          involvementType: 'CPHHOLDERSHIP',
          locationId: 'L97339',
          vetnetCoreId: '5500871',
          livestockUnitId: null,
          status: null,
          lastChecked: null,
          from: '2021-03-01',
          selected: true
        }
      ]
    },
    {
      ...party3,
      involvements: [
        {
          role: 'holder',
          involvementType: 'CPHHOLDERSHIP',
          locationId: 'L120044',
          vetnetCoreId: '4102233',
          livestockUnitId: null,
          status: null,
          lastChecked: null,
          from: '2012-06-15',
          selected: false
        }
      ]
    },
    { ...party2, involvements: [landOwnerOfL97339] },
    { ...party1, involvements: [keeperOfU000010] }
  ],
  '33/210/0455': [
    {
      ...party4,
      involvements: [
        {
          role: 'holder',
          involvementType: 'CPHHOLDERSHIP',
          locationId: 'L104588',
          vetnetCoreId: '6120458',
          livestockUnitId: null,
          status: null,
          lastChecked: null,
          from: '2014-09-01',
          selected: true
        },
        {
          role: 'keeper',
          involvementType: 'PRIMARYKEEPEROF',
          locationId: 'L104588',
          vetnetCoreId: null,
          livestockUnitId: 'U000420',
          status: 'ACTIVE',
          lastChecked: null,
          from: '2014-09-01',
          selected: null
        }
      ]
    }
  ],
  '21/087/0042': [
    {
      ...party5,
      involvements: [
        {
          role: 'holder',
          involvementType: 'CPHHOLDERSHIP',
          locationId: 'L151203',
          vetnetCoreId: '7034519',
          livestockUnitId: null,
          status: null,
          lastChecked: null,
          from: '2023-08-14',
          selected: true
        }
      ]
    }
  ]
}

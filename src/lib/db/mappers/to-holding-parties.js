import { mask } from '../../pii/index.js'
import { asNullableDate } from './as-nullable-date.js'
import { asNullableString } from './as-nullable-string.js'
import { asPreferredFlag } from './as-preferred-flag.js'
import { bySelectedHoldership } from './by-selected-holdership.js'
import { toAddress } from './to-address.js'
import { toOrganisations } from './to-organisations.js'
import { toPeople } from './to-people.js'

/** @type {Record<string, string>} */
const ROLES = {
  CPHHOLDERSHIP: 'holder',
  OWNEROFLOCATION: 'landOwner',
  PRIMARYKEEPEROF: 'keeper',
  SECONDARYKEEPEROF: 'keeper',
  OWNEROF: 'keeper'
}

/** @type {Record<string, [string, string]>} */
const CONTACT_METHODS = {
  EMAIL: ['email', 'emailAddress'],
  MOBILE: ['mobile', 'phoneNumber'],
  LANDLINE: ['landline', 'phoneNumber'],
  FAX: ['fax', 'faxNumber']
}

/**
 * The involvement rows of a CPH's parties, once each. Owner-of-place and
 * livestock-unit rows are all kept, but holder rows only for the CPH's own
 * active holderships: a holdership of another CPH at the same location, or a
 * second copy of one, is left out, so `/parties` and `/locations` agree on
 * who holds what.
 *
 * @param {Record<string, unknown>[]} holderships find-holdings.sql rows for the CPH
 * @param {Record<string, unknown>[]} involvements find-party-involvements.sql rows for their features
 */
export const toHoldingInvolvements = (holderships, involvements) => {
  const holdershipKeys = new Set(
    holderships.map((row) => row.feature_involvement_pk)
  )
  const keys = new Set()

  return involvements.filter((row) => {
    const key = `${row.involvement_type}:${row.involvement_pk}`

    if (keys.has(key)) {
      return false
    }

    keys.add(key)

    return (
      row.involvement_type !== 'CPHHOLDERSHIP' ||
      holdershipKeys.has(row.involvement_pk)
    )
  })
}

/**
 * @param {Record<string, unknown>} row a find-party-involvements.sql row
 * @param {unknown} selectedKey the key of the CPH's selected holdership
 */
const toInvolvement = (row, selectedKey) => {
  const role = ROLES[String(row.involvement_type)]

  return {
    role,
    involvementType: row.involvement_type,
    locationId: row.location_id,
    vetnetCoreId: asNullableString(row.vetnet_core_id),
    livestockUnitId: asNullableString(row.livestock_unit_id),
    status: asNullableString(row.involvement_status),
    lastChecked: asNullableDate(row.last_checked_date),
    from: asNullableDate(row.involvement_from_date),
    selected: role === 'holder' ? row.involvement_pk === selectedKey : null
  }
}

/**
 * SAM records an organisation's named contacts by name only. The organisation
 * mapper also fills their phone and e-mail from the organisation's own
 * telecoms, which `/parties` lists, current, in `contactMethods`.
 *
 * @param {{ fullName: string | null }} contact
 */
const toNamedContact = ({ fullName }) => ({
  fullName,
  emailAddress: null,
  phoneNumber: null
})

/**
 * @param {Record<string, unknown>} row a find-party-roles.sql row
 */
const toRole = (row) => ({
  mainRoleType: asNullableString(row.main_role_type),
  roleType: asNullableString(row.role_type),
  roleName: asNullableString(row.role_name),
  from: asNullableDate(row.party_role_from_date)
})

/**
 * Every current postal address of a party, once each: an address linked twice
 * is preferred if either link is.
 *
 * @param {Record<string, unknown>[]} rows the party's find-party-addresses.sql rows
 */
const toAddresses = (rows) => {
  const addresses = new Map()

  for (const row of rows) {
    const address = toAddress(row)
    const listed = addresses.get(row.address_pk)

    if (listed) {
      listed.isPreferred ||= address.isPreferred
    } else {
      addresses.set(row.address_pk, address)
    }
  }

  return [...addresses.values()]
}

/**
 * Every current e-mail, phone and fax entry of a party. A value linked twice
 * for the same use is one entry, preferred if either link is. Values are
 * compared before they are masked, so a masked client still receives two
 * numbers that mask alike.
 *
 * @param {Record<string, unknown>[]} rows the party's find-party-contacts.sql rows
 */
const toContactMethods = (rows) => {
  const contactMethods = new Map()

  for (const row of rows) {
    const [type, valueKey] =
      CONTACT_METHODS[String(row.telecom_address_type)] ?? []
    const value = asNullableString(row.contact_value)

    if (!type || !value) {
      continue
    }

    const usageType = asNullableString(row.address_usage_type)
    const isPreferred = asPreferredFlag(row.preferred_contact_method_ind)
    const key = `${type}:${value}:${usageType}`
    const listed = contactMethods.get(key)

    if (listed) {
      listed.isPreferred ||= isPreferred
    } else {
      contactMethods.set(key, {
        type,
        [valueKey]: mask(value),
        isPreferred,
        usageType
      })
    }
  }

  return [...contactMethods.values()]
}

/**
 * The items of `GET /holdings/{countyId}/{parishId}/{holdingId}/parties`: one
 * per party, in the order of its first involvement, with an `involvements`
 * entry for each of its involvements with the CPH. The person and
 * organisation fields come from the `POST /customers/find` and
 * `POST /organisations/find` mappers.
 *
 * @param {{
 *   holderships: Record<string, unknown>[],
 *   involvements: Record<string, unknown>[],
 *   roles: Record<string, unknown>[],
 *   contacts: Record<string, unknown>[],
 *   addresses: Record<string, unknown>[],
 *   people: Record<string, unknown>[],
 *   organisations: Record<string, unknown>[],
 *   organisationAttributes: Record<string, unknown>[]
 * }} rows the CPH's holderships, its involvements as
 *   `toHoldingInvolvements` returns them, and its parties' role, contact,
 *   address, find-customers.sql and organisation-attribute rows
 */
export const toHoldingParties = ({
  holderships,
  involvements,
  roles,
  contacts,
  addresses,
  people,
  organisations,
  organisationAttributes
}) => {
  const [selected] = holderships.toSorted(bySelectedHoldership)

  return [...Map.groupBy(involvements, (row) => row.party_pk)].map(
    ([partyKey, partyInvolvements]) => {
      const id = String(partyInvolvements[0].party_id)
      const partyType = asNullableString(partyInvolvements[0].party_type)

      /** @param {Record<string, unknown>[]} rows */
      const ofParty = (rows) => rows.filter((row) => row.party_pk === partyKey)

      const detailRows = ofParty(
        partyType === 'ORGANISATION' ? organisations : people
      )

      // the find mappers throw on a row without the name SAM requires, so such
      // a party keeps null name fields instead of failing the whole list
      const [person] =
        partyType === 'PERSON'
          ? toPeople(
              detailRows.filter((row) => asNullableString(row.last_name)),
              [id]
            )
          : []
      const [organisation] =
        partyType === 'ORGANISATION'
          ? toOrganisations(
              detailRows.filter((row) =>
                asNullableString(row.organisation_name)
              ),
              [id]
            )
          : []
      const [attributes] = ofParty(organisationAttributes)

      return {
        type: 'parties',
        id,
        partyType,
        title: person?.title ?? null,
        firstName: person?.firstName ?? null,
        middleName: person?.middleName ?? null,
        lastName: person?.lastName ?? null,
        organisationName: organisation?.organisationName ?? null,
        organisationType: asNullableString(attributes?.organisation_type),
        namedContacts: organisation
          ? {
              primaryContact: toNamedContact(
                organisation.contactDetails.primaryContact
              ),
              secondaryContact: toNamedContact(
                organisation.contactDetails.secondaryContact
              )
            }
          : null,
        roles: ofParty(roles).map(toRole),
        addresses: toAddresses(ofParty(addresses)),
        contactMethods: toContactMethods(ofParty(contacts)),
        involvements: partyInvolvements.map((row) =>
          toInvolvement(row, selected.feature_involvement_pk)
        )
      }
    }
  )
}

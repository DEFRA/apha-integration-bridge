import Joi from 'joi'

import { PartyAddress } from './address.js'
import { CustomerContactDetails, Role } from './customers.js'
import { baseData } from './helpers.js'
import { OrganisationContactDetails } from './organisation.js'

export const Involvement = Joi.object({
  role: Joi.string().valid('holder', 'landOwner', 'keeper').required(),
  involvementType: Joi.string()
    .required()
    .description(
      'SAM involvement type: CPHHOLDERSHIP for holders, OWNEROFLOCATION for land owners, PRIMARYKEEPEROF, SECONDARYKEEPEROF or OWNEROF for keepers'
    ),
  locationId: Joi.string().required(),
  vetnetCoreId: Joi.string()
    .required()
    .allow(null)
    .description('Holders only. Pairs the entry with an item in `/locations`'),
  livestockUnitId: Joi.string()
    .required()
    .allow(null)
    .description('Keepers only. The livestock unit the involvement is with'),
  status: Joi.string()
    .required()
    .allow(null)
    .description(
      'Land owners: CONFIRMED or UNCONFIRMED. Keepers: the keepership status (UNCONFIRMED, ACTIVE or PENDINGVERIFICATION), or for an owner the ownership status (UNCONFIRMED or CONFIRMED)'
    ),
  lastChecked: Joi.string()
    .required()
    .allow(null)
    .description('Land owners only. When SAM last checked the ownership'),
  from: Joi.string().required().allow(null),
  selected: Joi.boolean()
    .required()
    .allow(null)
    .description(
      'Holders only. True on the holdership `POST /holdings/find` reports once corrected'
    )
})
  .description(
    'One way a party is involved with the CPH. `role`, `involvementType` and `locationId` are always set; the other members are `null` where they do not apply.'
  )
  .label('Involvement')

/**
 * A person or organisation involved with a CPH, as one flat resource. The
 * `partyType` says which set of name fields applies; the other set is `null`.
 */
export const Party = baseData({
  plural: 'parties',
  singular: 'party'
})
  .keys({
    partyType: Joi.string().valid('PERSON', 'ORGANISATION').required(),
    title: Joi.string()
      .required()
      .allow(null)
      .description('Persons only; `Unknown` when SAM has none'),
    firstName: Joi.string().required().allow(null),
    middleName: Joi.string().required().allow(null),
    lastName: Joi.string().required().allow(null),
    organisationName: Joi.string().required().allow(null),
    organisationType: Joi.string()
      .required()
      .allow(null)
      .description(
        "Organisations only. SAM organisation type code: AHORGUNIT marks one of Defra's own organisational units; most organisations are NOTKNOWN"
      ),
    namedContacts: OrganisationContactDetails.required()
      .allow(null)
      .description(
        "Organisations: SAM's named primary and secondary contacts. `null` for persons"
      ),
    roles: Joi.array()
      .items(Role)
      .required()
      .description('Every current SAM role the party holds'),
    addresses: Joi.array()
      .items(PartyAddress)
      .required()
      .description('Every current postal address'),
    contactMethods: Joi.array()
      .items(CustomerContactDetails)
      .required()
      .description(
        "Every current e-mail, phone and fax entry, all the party's own"
      ),
    involvements: Joi.array().items(Involvement).min(1).required()
  })
  .label('Party')

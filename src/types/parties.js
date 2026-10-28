import Joi from 'joi'

import { Address } from './address.js'
import { baseData } from './find/helpers.js'
import { OrganisationContactDetails } from './find/organisations.js'
import { ContactMethods, Role } from './party-details.js'

const Involvement = Joi.object({
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
    .description(
      'Holders only. Pairs the entry with an item of the holding `/locations`'
    ),
  livestockUnitId: Joi.string()
    .required()
    .allow(null)
    .description('Keepers only. The livestock unit the involvement is with'),
  status: Joi.string()
    .required()
    .allow(null)
    .description(
      'Land owners: the owner-of-place status. Keepers: the keepership status, or for an owner the ownership status'
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
      'Holders only. True on the holdership `POST /holdings/find` reports'
    )
})
  .description(
    'One way the party is involved with the CPH. `role`, `involvementType` and `locationId` are always set; the other members are `null` where they do not apply'
  )
  .label('Involvement')

/**
 * An item of `GET /holdings/{countyId}/{parishId}/{holdingId}/parties`: a
 * person or an organisation as one flat resource. `partyType` says which set
 * of name fields applies; the other set is `null`.
 */
export const Party = baseData({
  plural: 'parties',
  singular: 'party'
})
  .keys({
    partyType: Joi.string()
      .valid('PERSON', 'ORGANISATION')
      .required()
      .allow(null)
      .description('`null` when SAM records no current party version'),
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
        "Organisations only: the names of SAM's primary and secondary contacts. SAM records no number or e-mail for them, so those members are `null`; the organisation's own are in `contactMethods`"
      ),
    roles: Joi.array()
      .items(Role)
      .required()
      .description('Every current SAM role the party holds'),
    addresses: Joi.array()
      .items(Address.keys({ isPreferred: Joi.boolean().required() }))
      .required()
      .description(
        "Every current postal address, with SAM's preferred-contact indicator"
      ),
    contactMethods: Joi.array()
      .items(ContactMethods)
      .required()
      .description('Every current e-mail, phone and fax entry'),
    involvements: Joi.array().items(Involvement).min(1).required()
  })
  .label('Party')

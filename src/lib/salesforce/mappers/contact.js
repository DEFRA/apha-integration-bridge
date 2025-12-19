import {
  applyAddressToBody,
  mapInlineContactAddress,
  selectAddress
} from './address.js'
import {
  MappingError,
  applyFieldMappings,
  mapTitle,
  normaliseDate,
  normaliseString
} from './shared.js'

const CONTACT_MAPPINGS = [
  {
    source: 'defra_title',
    target: 'Salutation',
    transform: mapTitle
  },
  {
    source: 'firstname',
    target: 'FirstName',
    transform: normaliseString,
    allowMissingFlag: true
  },
  {
    source: 'lastname',
    target: 'LastName',
    transform: normaliseString,
    allowMissingFlag: true
  },
  {
    source: 'emailaddress1',
    target: 'APHA_EmailAddress1__c',
    transform: normaliseString,
    allowMissingFlag: true
  },
  {
    source: 'emailaddress1',
    target: 'Email',
    transform: normaliseString,
    allowMissingFlag: true
  },
  {
    source: 'birthdate',
    target: 'Birthdate',
    transform: normaliseDate
  },
  {
    source: 'telephone1',
    target: 'Phone',
    transform: normaliseString,
    allowMissingFlag: true
  },
  {
    source: 'address1_telephone1',
    target: 'HomePhone',
    transform: normaliseString,
    allowMissingFlag: true
  }
]

// Build a Salesforce Contact upsert request for a DEFRA service user payload.
function buildContactRequest(contact, addressContext, apiVersion) {
  if (!contact?.contactid) {
    return null
  }

  const body = {}

  applyFieldMappings(body, contact, CONTACT_MAPPINGS)

  const mailingAddress =
    selectAddress(addressContext.addressDetails, addressContext.addresses) ||
    mapInlineContactAddress(contact)

  applyAddressToBody(
    body,
    mailingAddress,
    'MailingStreet',
    'MailingCity',
    'MailingState',
    'MailingPostalCode',
    'MailingCountryCode',
    'MailingCountry'
  )

  if (mailingAddress?.addressType) {
    body.APHA_AddressTypeCode__c = mailingAddress.addressType
  }

  // Temporarily omit custom address flags/UPRN until the Salesforce org has these fields
  // if (mailingAddress?.uprn !== undefined) {
  //   body.APHA_MailingAddressUPRN__c = mailingAddress.uprn
  // }
  //
  // if (mailingAddress?.fromCompaniesHouse !== undefined) {
  //   body.APHA_MailingFromCompaniesHouse__c = mailingAddress.fromCompaniesHouse
  // }

  if (addressContext.accountReference) {
    body.AccountId = addressContext.accountReference
  }

  if (Object.keys(body).length === 0) {
    throw new MappingError(
      'Contact payload contains contactid but no upsertable fields'
    )
  }

  return {
    method: 'PATCH',
    url: `/services/data/${apiVersion}/sobjects/Contact/APHA_DefraCustomerId__c/${encodeURIComponent(
      contact.contactid
    )}`,
    referenceId: 'ContactUpsert',
    body
  }
}

export { buildContactRequest }

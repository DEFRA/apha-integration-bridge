import { applyAddressToBody, mapRegisteredAddress } from './address.js'
import {
  MappingError,
  applyFieldMappings,
  normaliseDate,
  normaliseString
} from './shared.js'

const ACCOUNT_MAPPINGS = [
  {
    source: 'defra_uniquereference',
    target: 'APHA_OrganisationID__c',
    transform: normaliseString,
    allowMissingFlag: true
  },
  {
    source: 'name',
    target: 'Name',
    transform: normaliseString,
    allowMissingFlag: true
  },
  {
    source: 'defra_charitynumber',
    target: 'APHA_CharityNumber__c',
    transform: normaliseString,
    allowMissingFlag: true
  },
  {
    source: 'defra_charitynumberni',
    target: 'APHA_CharityNumberNI__c',
    transform: normaliseString,
    allowMissingFlag: true
  },
  {
    source: 'defra_charitynumberscot',
    target: 'APHA_CharityNumberScot__c',
    transform: normaliseString,
    allowMissingFlag: true
  },
  {
    source: 'defra_cmcrn',
    target: 'APHA_CompanyRegistrationNumber__c',
    transform: normaliseString,
    allowMissingFlag: true
  },
  {
    source: 'telephone1',
    target: 'Phone',
    transform: normaliseString,
    allowMissingFlag: true
  },
  {
    source: 'emailaddress1',
    target: 'APHA_Email__c',
    transform: normaliseString,
    allowMissingFlag: true
  },
  {
    source: 'defra_dateofincorporation',
    target: 'APHA_DateofIncorporation__c',
    transform: normaliseDate
  },
  {
    source: 'defra_dateofdissolution',
    target: 'APHA_DateofDissolution__c',
    transform: normaliseDate
  }
]

// Build a Salesforce Account upsert request for a DEFRA account payload.
function buildAccountRequest(account, apiVersion) {
  if (!account?.accountid) {
    return null
  }

  const body = {}

  applyFieldMappings(body, account, ACCOUNT_MAPPINGS)

  applyAddressToBody(
    body,
    mapRegisteredAddress(account),
    'BillingStreet',
    'BillingCity',
    'BillingState',
    'BillingPostalCode',
    'BillingCountryCode',
    'BillingCountry'
  )

  if (Object.keys(body).length === 0) {
    throw new MappingError(
      'Account payload contains accountid but no upsertable fields'
    )
  }

  return {
    method: 'PATCH',
    url: `/services/data/${apiVersion}/sobjects/Account/APHA_DefraAccountID__c/${encodeURIComponent(
      account.accountid
    )}`,
    referenceId: 'AccountUpsert',
    body
  }
}

export { buildAccountRequest }

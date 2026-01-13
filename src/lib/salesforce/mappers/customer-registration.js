import { config } from '../../../config.js'
import { buildAccountRequest } from './account.js'
import { buildContactRequest } from './contact.js'
import { MappingError } from './shared.js'

/**
 * Build a Salesforce composite upsert request for a DCI customer event.
 *
 * @param {object} event Validated DCI customer event
 * @param {{ apiVersion?: string }} [options]
 */
export function buildCustomerRegistrationComposite(event, options = {}) {
  if (!event || typeof event !== 'object') {
    throw new MappingError('Event payload is missing or invalid')
  }

  const apiVersion =
    options.apiVersion || config.get('salesforce.apiVersion') || 'v62.0'

  const compositeRequest = []

  const accountRequest = buildAccountRequest(event.account, apiVersion)

  if (accountRequest) {
    compositeRequest.push(accountRequest)
  }

  const contactRequest = buildContactRequest(
    event.defra_serviceuser,
    {
      addressDetails: event.defra_addressdetails,
      addresses: event.defra_address,
      accountReference: accountRequest ? '@{AccountUpsert.id}' : undefined
    },
    apiVersion
  )

  if (contactRequest) {
    compositeRequest.push(contactRequest)
  }

  if (compositeRequest.length === 0) {
    throw new MappingError(
      'Event must include at least an account.accountid or defra_serviceuser.contactid'
    )
  }

  return {
    allOrNone: true,
    compositeRequest
  }
}

export { MappingError } from './shared.js'

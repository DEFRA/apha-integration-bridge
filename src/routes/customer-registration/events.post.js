import Joi from 'joi'

import {
  HTTPException,
  HTTPError,
  HTTPExceptionSchema
} from '../../lib/http/http-exception.js'
import {
  buildCustomerRegistrationComposite,
  MappingError
} from '../../lib/salesforce/mappers/customer-registration.js'
import { salesforceClient } from '../../lib/salesforce/client.js'

const AddressDetailsSchema = Joi.object({
  defra_addressid: Joi.alternatives().try(Joi.string(), Joi.number()),
  defra_addresstype: Joi.alternatives().try(Joi.string(), Joi.number()),
  defra_validfrom: Joi.string().isoDate(),
  defra_validto: Joi.string().isoDate(),
  defra_phone: Joi.string(),
  defra_mobile: Joi.string(),
  defra_fax: Joi.string(),
  emailaddress: Joi.string().email().allow(null)
})
  .label('AddressDetails')
  .unknown(true)

const AddressSchema = Joi.object({
  defra_addressid: Joi.alternatives().try(Joi.string(), Joi.number()),
  defra_buildingname: Joi.string(),
  defra_premises: Joi.string(),
  defra_subbuildingname: Joi.string(),
  defra_street: Joi.string(),
  defra_locality: Joi.string(),
  defra_dependentlocality: Joi.string(),
  defra_towntext: Joi.string(),
  defra_county: Joi.string(),
  defra_countryid: Joi.string(),
  defra_postcode: Joi.string(),
  defra_internationalpostalcode: Joi.string(),
  defra_uprn: Joi.alternatives().try(Joi.string(), Joi.number()),
  defra_fromcompanieshouse: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('true', 'false')
  )
})
  .label('Address')
  .unknown(true)

const ContactSchema = Joi.object({
  contactid: Joi.string().required(),
  defra_title: Joi.alternatives().try(Joi.string(), Joi.number()),
  firstname: Joi.string(),
  lastname: Joi.string(),
  emailaddress1: Joi.string().email().allow(null),
  birthdate: Joi.string().isoDate(),
  telephone1: Joi.string(),
  address1_telephone1: Joi.string()
})
  .label('DefraServiceUser')
  .unknown(true)

const AccountSchema = Joi.object({
  accountid: Joi.string().required(),
  defra_uniquereference: Joi.string(),
  name: Joi.string(),
  emailaddress1: Joi.string().email().allow(null),
  telephone1: Joi.string(),
  defra_charitynumber: Joi.string(),
  defra_charitynumberni: Joi.string(),
  defra_charitynumberscot: Joi.string(),
  defra_cmcrn: Joi.string(),
  defra_dateofincorporation: Joi.string().isoDate(),
  defra_dateofdissolution: Joi.string().isoDate(),
  defra_addregcountryid: Joi.string(),
  defra_addregtown: Joi.string(),
  defra_addregcounty: Joi.string(),
  defra_addregpostcode: Joi.string(),
  defra_addregbuildingname: Joi.string(),
  defra_addregsubbuildingname: Joi.string(),
  defra_addregbuildingnumber: Joi.string(),
  defra_addregstreet: Joi.string(),
  defra_addreglocality: Joi.string()
})
  .label('Account')
  .unknown(true)

const CustomerEventSchema = Joi.object({
  metadata: Joi.object().unknown(true),
  defra_serviceuser: ContactSchema,
  account: AccountSchema,
  defra_addressdetails: Joi.array().items(AddressDetailsSchema),
  defra_address: Joi.array().items(AddressSchema)
})
  .custom((value, helpers) => {
    const hasContact = Boolean(value.defra_serviceuser?.contactid)
    const hasAccount = Boolean(value.account?.accountid)

    if (!hasContact && !hasAccount) {
      return helpers.error('any.custom', {
        message:
          'At least account.accountid or defra_serviceuser.contactid is required'
      })
    }

    return value
  }, 'external id presence check')
  .label('CustomerEvent')
  .unknown(true)

const ResponseSchema = Joi.object({
  message: Joi.string().required(),
  salesforceRequest: Joi.object().required().unknown(true),
  salesforceResponse: Joi.object().unknown(true)
})
  .label('CustomerRegistrationResponse')
  .description('Result of forwarding the event to Salesforce')

/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
export const options = {
  auth: {
    mode: 'required'
  },
  tags: ['api', 'customer-registration'],
  description:
    'Spike endpoint to accept DEFRA Identity customer events and forward them to Salesforce',
  plugins: {
    'hapi-swagger': {
      id: 'customer-registration-events',
      security: [{ Bearer: [] }]
    }
  },
  validate: {
    payload: CustomerEventSchema,
    headers: Joi.object({
      accept: Joi.string()
        .default('application/vnd.apha.1+json')
        .description('Accept header for API versioning')
    }).options({ allowUnknown: true }),
    failAction: HTTPException.failValidation
  },
  response: {
    status: {
      200: ResponseSchema,
      202: ResponseSchema,
      '400-500': HTTPExceptionSchema
    }
  }
}

/**
 * @type {import('@hapi/hapi').Lifecycle.Method}
 */
export async function handler(request, h) {
  if (request.pre.apiVersion > 1.0) {
    return new HTTPException(
      'UNSUPPORTED_VERSION',
      `Unknown version: ${request.pre.apiVersion}`
    ).boomify()
  }

  try {
    const compositeRequest = buildCustomerRegistrationComposite(request.payload)

    if (!salesforceClient.cfg.enabled) {
      return h
        .response({
          message: 'Salesforce integration disabled - returning composite only',
          salesforceRequest: compositeRequest
        })
        .code(202)
    }

    const salesforceResponse = await salesforceClient.sendComposite(
      compositeRequest,
      request.logger
    )

    return h
      .response({
        message: 'Salesforce composite executed',
        salesforceRequest: compositeRequest,
        salesforceResponse
      })
      .code(200)
  } catch (error) {
    request.logger?.error(error)

    if (error instanceof HTTPException) {
      return error.boomify()
    }

    const isBadRequest = error instanceof MappingError

    const httpException = new HTTPException(
      isBadRequest ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR',
      isBadRequest
        ? error.message
        : 'Failed to process customer event for Salesforce',
      [
        new HTTPError(
          isBadRequest ? 'VALIDATION_ERROR' : 'UNKNOWN',
          error.message
        )
      ]
    )

    return httpException.boomify()
  }
}

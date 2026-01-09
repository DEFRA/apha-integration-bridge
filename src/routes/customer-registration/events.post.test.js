import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from '@jest/globals'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import Hapi from '@hapi/hapi'

import { config } from '../../config.js'
import { salesforceClient } from '../../lib/salesforce/client.js'
import { versionPlugin } from '../../common/helpers/versioning.js'

const mswServer = setupServer()
const originalSalesforceEnv = {
  enabled: process.env.SALESFORCE_ENABLED,
  baseUrl: process.env.SALESFORCE_BASE_URL,
  clientId: process.env.SALESFORCE_CLIENT_ID,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
  apiVersion: process.env.SALESFORCE_API_VERSION,
  timeoutMs: process.env.SALESFORCE_TIMEOUT_MS
}

/**
 * Create a minimal Hapi server with the customer-registration route registered.
 */
async function createTestServer(onInvoke) {
  const { handler, options } = await import('./events.post.js')
  const server = Hapi.server({ port: 0 })

  const wrappedHandler =
    typeof onInvoke === 'function'
      ? async (request, h) => {
          onInvoke()

          return handler(request, h)
        }
      : handler

  await server.register({ plugin: versionPlugin })

  server.route({
    method: 'POST',
    path: '/customer-registration/events',
    handler: wrappedHandler,
    options: {
      ...options,
      auth: false // simplify tests; bearer handling is not under test here
    }
  })

  await server.initialize()

  return server
}

describe('customer-registration route → Salesforce composite', () => {
  /** @type {import('@hapi/hapi').Server | undefined} */
  let server
  let receivedCompositeBody
  let originalCfgDescriptor

  const originalSalesforceConfig = config.get('salesforce')

  beforeAll(() => {
    mswServer.listen({ onUnhandledRequest: 'error' })
  })

  afterAll(() => {
    mswServer.close()
  })

  beforeEach(async () => {
    receivedCompositeBody = undefined

    process.env.SALESFORCE_ENABLED = 'true'
    process.env.SALESFORCE_BASE_URL = 'https://salesforce.test'
    process.env.SALESFORCE_CLIENT_ID = 'client-id'
    process.env.SALESFORCE_CLIENT_SECRET = 'client-secret'
    process.env.SALESFORCE_API_VERSION = 'v62.0'
    process.env.SALESFORCE_TIMEOUT_MS = '10000'

    config.set('salesforce.enabled', true)
    config.set('salesforce.baseUrl', 'https://salesforce.test')
    config.set('salesforce.clientId', 'client-id')
    config.set('salesforce.clientSecret', 'client-secret')
    config.set('salesforce.apiVersion', 'v62.0')

    salesforceClient.cachedToken = null
    salesforceClient.cachedInstanceUrl = null
    salesforceClient.expiresAt = 0

    originalCfgDescriptor = Object.getOwnPropertyDescriptor(
      salesforceClient,
      'cfg'
    )

    Object.defineProperty(salesforceClient, 'cfg', {
      value: {
        enabled: true,
        baseUrl: 'https://salesforce.test',
        authUrl: undefined,
        clientId: 'client-id',
        clientSecret: 'client-secret',
        apiVersion: 'v62.0',
        requestTimeoutMs: 10000
      },
      writable: true,
      configurable: true
    })

    mswServer.use(
      http.post('https://salesforce.test/services/oauth2/token', async () => {
        return HttpResponse.json({
          access_token: 'token-123',
          instance_url: 'https://salesforce.test',
          expires_in: 3600
        })
      }),
      http.post(
        'https://salesforce.test/services/data/v62.0/composite',
        async ({ request }) => {
          receivedCompositeBody = await request.json()

          return HttpResponse.json({
            compositeResponse: [{ httpStatusCode: 200, body: {} }]
          })
        }
      )
    )
  })

  afterEach(async () => {
    mswServer.resetHandlers()

    if (originalCfgDescriptor) {
      Object.defineProperty(salesforceClient, 'cfg', originalCfgDescriptor)
    } else {
      delete salesforceClient.cfg
    }

    if (server) {
      await server.stop()
      server = undefined
    }

    config.set('salesforce.enabled', originalSalesforceConfig.enabled)
    config.set('salesforce.baseUrl', originalSalesforceConfig.baseUrl)
    config.set('salesforce.clientId', originalSalesforceConfig.clientId)
    config.set('salesforce.clientSecret', originalSalesforceConfig.clientSecret)
    config.set('salesforce.apiVersion', originalSalesforceConfig.apiVersion)
    config.set(
      'salesforce.requestTimeoutMs',
      originalSalesforceConfig.requestTimeoutMs
    )

    process.env.SALESFORCE_ENABLED = originalSalesforceEnv.enabled
    process.env.SALESFORCE_BASE_URL = originalSalesforceEnv.baseUrl
    process.env.SALESFORCE_CLIENT_ID = originalSalesforceEnv.clientId
    process.env.SALESFORCE_CLIENT_SECRET = originalSalesforceEnv.clientSecret
    process.env.SALESFORCE_API_VERSION = originalSalesforceEnv.apiVersion
    process.env.SALESFORCE_TIMEOUT_MS = originalSalesforceEnv.timeoutMs
  })

  test('forwards mapped composite payload to Salesforce', async () => {
    server = await createTestServer()

    const payload = {
      account: {
        accountid: 'ACC-1001',
        name: 'Global Solutions Test Ltd',
        name_hasvalue: true,
        emailaddress1: 'info@example.com',
        emailaddress1_hasvalue: true,
        defra_addregpostcode: 'ME18 5NF',
        defra_addregpostcode_hasvalue: true,
        defra_addregtown: 'Maidstone',
        defra_addregtown_hasvalue: true,
        defra_addregcountryid: 'GB',
        defra_addregcountryid_hasvalue: true
      },
      defra_serviceuser: {
        contactid: 'CON-2001',
        defra_title: 1,
        defra_title_hasvalue: true,
        firstname: 'Jane',
        firstname_hasvalue: true,
        lastname: 'Doe',
        lastname_hasvalue: true,
        emailaddress1: 'jane.doe@test.co.uk',
        emailaddress1_hasvalue: true,
        telephone1: '01111111111',
        telephone1_hasvalue: true
      },
      defra_addressdetails: [
        {
          defra_addressid: 'ADDR-3001',
          defra_addresstype: 'Correspondence',
          defra_addresstype_hasvalue: true,
          defra_validfrom: '2023-01-01T00:00:00.000Z'
        }
      ],
      defra_address: [
        {
          defra_addressid: 'ADDR-3001',
          defra_street: 'High Street',
          defra_towntext: 'Stevenage',
          defra_postcode: 'SG18 8XX',
          defra_countryid: 'GB'
        }
      ]
    }

    const response = await server.inject({
      method: 'POST',
      url: '/customer-registration/events',
      payload,
      headers: {
        accept: 'application/vnd.apha.1+json'
      }
    })

    expect(config.get('salesforce.enabled')).toBe(true)
    expect(salesforceClient.cfg.enabled).toBe(true)
    expect(response.statusCode).toBe(200)
    expect(receivedCompositeBody).toBeDefined()
    expect(receivedCompositeBody).toMatchObject({
      allOrNone: true,
      compositeRequest: [
        expect.objectContaining({
          referenceId: 'AccountUpsert',
          url: expect.stringContaining(
            '/sobjects/Account/APHA_DefraAccountID__c/ACC-1001'
          ),
          body: expect.objectContaining({
            Name: 'Global Solutions Test Ltd',
            APHA_Email__c: 'info@example.com',
            BillingPostalCode: 'ME18 5NF',
            BillingCity: 'Maidstone',
            BillingCountry: 'United Kingdom'
          })
        }),
        expect.objectContaining({
          referenceId: 'ContactUpsert',
          url: expect.stringContaining(
            '/sobjects/Contact/APHA_DefraCustomerId__c/CON-2001'
          ),
          body: expect.objectContaining({
            Salutation: 'Mr',
            FirstName: 'Jane',
            LastName: 'Doe',
            Email: 'jane.doe@test.co.uk',
            MailingPostalCode: 'SG18 8XX',
            MailingCity: 'Stevenage',
            MailingCountry: 'United Kingdom',
            AccountId: '@{AccountUpsert.id}'
          })
        })
      ]
    })

    const [accountUpsert, contactUpsert] =
      receivedCompositeBody.compositeRequest

    expect(accountUpsert.body).not.toHaveProperty('BillingCountryCode')
    expect(contactUpsert.body).not.toHaveProperty('MailingCountryCode')
  })

  test('returns composite only when Salesforce integration is disabled', async () => {
    config.set('salesforce.enabled', false)
    salesforceClient.cfg.enabled = false
    process.env.SALESFORCE_ENABLED = 'false'

    server = await createTestServer()

    const payload = {
      defra_serviceuser: {
        contactid: 'CON-9999',
        lastname: 'OnlySurname',
        lastname_hasvalue: true
      }
    }

    const response = await server.inject({
      method: 'POST',
      url: '/customer-registration/events',
      payload,
      headers: {
        accept: 'application/vnd.apha.1+json'
      }
    })

    expect(response.statusCode).toBe(202)
    expect(receivedCompositeBody).toBeUndefined()

    const body = response.result

    expect(body.salesforceRequest).toBeDefined()
    expect(body.message).toContain('disabled')
  })
})

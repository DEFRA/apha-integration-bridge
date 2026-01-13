import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

import { messageProcessed, salesforceForwarded } from './metrics.js'
import { processMessage } from './process-message.js'

const validEvent = {
  defra_serviceuser: {
    contactid: 'c1',
    firstname: 'Test',
    lastname: 'User'
  },
  defra_addressdetails: [],
  defra_address: []
}

describe('processMessage', () => {
  /** @type {ReturnType<typeof createReceiverMock>} */
  let receiver
  /** @type {import('pino').Logger} */
  let logger
  let salesforceClient
  const mswServer = setupServer()
  /** @type {any} */
  let receivedCompositeBody

  const messageId = 'm-1'

  beforeAll(() => {
    mswServer.listen({ onUnhandledRequest: 'error' })
  })

  afterAll(() => {
    mswServer.close()
  })

  beforeEach(() => {
    receiver = createReceiverMock()
    logger = createLoggerMock()
    salesforceClient = {
      cfg: { enabled: true },
      sendComposite: jest.fn().mockResolvedValue({ ok: true })
    }
    receivedCompositeBody = undefined

    jest.spyOn(messageProcessed, 'add').mockImplementation(() => {})
    jest.spyOn(salesforceForwarded, 'add').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    mswServer.resetHandlers()
  })

  it('completes and records success when processing succeeds', async () => {
    await processMessage({
      message: { body: validEvent, messageId, deliveryCount: 0 },
      receiver,
      logger,
      entityPath: 'queue',
      maxDeliveryCount: 10,
      salesforceClient
    })

    expect(receiver.completeMessage).toHaveBeenCalled()
    expect(salesforceClient.sendComposite).toHaveBeenCalled()
    expect(messageProcessed.add).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ outcome: 'success', entityPath: 'queue' })
    )
    expect(salesforceForwarded.add).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ outcome: 'success' })
    )
  })

  it('dead-letters on validation failures', async () => {
    await processMessage({
      message: { body: 123, messageId, deliveryCount: 0 },
      receiver,
      logger,
      entityPath: 'queue',
      maxDeliveryCount: 10,
      salesforceClient
    })

    expect(receiver.deadLetterMessage).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ deadLetterReason: 'validation_failed' })
    )
    expect(messageProcessed.add).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        outcome: 'failure',
        reason: 'validation_failed'
      })
    )
    expect(salesforceForwarded.add).not.toHaveBeenCalled()
  })

  it('dead-letters when Salesforce is disabled', async () => {
    salesforceClient.cfg.enabled = false

    await processMessage({
      message: { body: validEvent, messageId, deliveryCount: 0 },
      receiver,
      logger,
      entityPath: 'queue',
      maxDeliveryCount: 10,
      salesforceClient
    })

    expect(receiver.deadLetterMessage).toHaveBeenCalled()
    expect(receiver.abandonMessage).not.toHaveBeenCalled()
  })

  it('abandons on Salesforce transient failure under retry threshold', async () => {
    salesforceClient.sendComposite.mockRejectedValue(new Error('sf down'))

    await processMessage({
      message: { body: validEvent, messageId, deliveryCount: 0 },
      receiver,
      logger,
      entityPath: 'queue',
      maxDeliveryCount: 3,
      salesforceClient
    })

    expect(receiver.abandonMessage).toHaveBeenCalled()
    expect(receiver.deadLetterMessage).not.toHaveBeenCalled()
    expect(salesforceForwarded.add).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        outcome: 'failure',
        reason: 'salesforce_error'
      })
    )
  })

  it('dead-letters when retry limit reached', async () => {
    salesforceClient.sendComposite.mockRejectedValue(new Error('sf down'))

    await processMessage({
      message: { body: validEvent, messageId, deliveryCount: 3 },
      receiver,
      logger,
      entityPath: 'queue',
      maxDeliveryCount: 3,
      salesforceClient
    })

    expect(receiver.deadLetterMessage).toHaveBeenCalled()
    expect(receiver.abandonMessage).not.toHaveBeenCalled()
  })

  it('sends a real DEFRA identity event to Salesforce via HTTP with correct composite payload', async () => {
    mswServer.use(
      http.post(
        'https://salesforce.test/services/data/v62.0/composite',
        async ({ request }) => {
          receivedCompositeBody = await request.json()

          return HttpResponse.json({ ok: true })
        }
      )
    )

    const richEvent = {
      defra_serviceuser: {
        contactid: 'contact-1',
        firstname: 'Alice',
        lastname: 'Smith',
        emailaddress1: 'alice@example.com'
      },
      account: {
        accountid: 'account-1',
        defra_uniquereference: 'URN123',
        name: 'Example Org',
        telephone1: '01234',
        emailaddress1: 'org@example.com'
      },
      defra_addressdetails: [],
      defra_address: []
    }

    await processMessage({
      message: { body: richEvent, messageId: 'http-case', deliveryCount: 0 },
      receiver,
      logger,
      entityPath: 'queue',
      maxDeliveryCount: 5,
      salesforceClient: {
        cfg: { enabled: true },
        sendComposite: async (composite) => {
          const res = await fetch(
            'https://salesforce.test/services/data/v62.0/composite',
            {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(composite)
            }
          )

          return res.json()
        }
      }
    })

    expect(receiver.completeMessage).toHaveBeenCalled()
    expect(receivedCompositeBody).toMatchObject({
      allOrNone: true,
      compositeRequest: [
        expect.objectContaining({
          referenceId: 'AccountUpsert',
          method: 'PATCH',
          url: expect.stringContaining(
            '/Account/APHA_DefraAccountID__c/account-1'
          ),
          body: expect.objectContaining({
            Name: 'Example Org',
            APHA_OrganisationID__c: 'URN123',
            Phone: '01234',
            APHA_Email__c: 'org@example.com'
          })
        }),
        expect.objectContaining({
          referenceId: 'ContactUpsert',
          method: 'PATCH',
          url: expect.stringContaining(
            '/Contact/APHA_DefraCustomerId__c/contact-1'
          ),
          body: expect.objectContaining({
            FirstName: 'Alice',
            LastName: 'Smith',
            Email: 'alice@example.com',
            APHA_EmailAddress1__c: 'alice@example.com',
            AccountId: '@{AccountUpsert.id}'
          })
        })
      ]
    })
  })
})

function createReceiverMock() {
  return {
    completeMessage: jest.fn().mockResolvedValue(undefined),
    abandonMessage: jest.fn().mockResolvedValue(undefined),
    deadLetterMessage: jest.fn().mockResolvedValue(undefined)
  }
}

function createLoggerMock() {
  return {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn()
  }
}

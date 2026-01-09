import { describe, expect, it } from '@jest/globals'

import {
  parseMessageBody,
  resolveEntityPath,
  validateCustomerEvent
} from './utils.js'
import { ValidationError } from './errors.js'

describe('service-bus utils', () => {
  it('extracts entity path from connection string', () => {
    const entity = resolveEntityPath(
      'Endpoint=sb://example;EntityPath=my-queue;SharedAccessKey=abc'
    )

    expect(entity).toBe('my-queue')
  })

  it('returns null when entity path missing', () => {
    expect(resolveEntityPath('Endpoint=sb://example;')).toBeNull()
  })

  it('parses JSON string bodies', () => {
    const body = parseMessageBody({
      body: JSON.stringify({ hello: 'world' })
    })

    expect(body).toEqual({ hello: 'world' })
  })

  it('parses Uint8Array bodies', () => {
    const body = parseMessageBody({
      body: new TextEncoder().encode('{"hi":"there"}')
    })

    expect(body).toEqual({ hi: 'there' })
  })

  it('returns object bodies untouched', () => {
    const payload = { foo: 'bar' }
    const body = parseMessageBody({ body: payload })

    expect(body).toBe(payload)
  })

  it('throws on unsupported body type', () => {
    expect(() => parseMessageBody({ body: 123 })).toThrow(ValidationError)
  })

  it('validates customer event', () => {
    const event = validateCustomerEvent({
      defra_serviceuser: { contactid: 'c1' },
      defra_addressdetails: [],
      defra_address: []
    })

    expect(event.defra_serviceuser.contactid).toBe('c1')
  })

  it('fails validation when ids missing', () => {
    expect(() =>
      validateCustomerEvent({
        defra_serviceuser: {},
        account: {},
        defra_addressdetails: [],
        defra_address: []
      })
    ).toThrow(ValidationError)
  })
})

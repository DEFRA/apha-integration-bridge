import { describe, expect, test } from '@jest/globals'

import { createClientsScopes } from './create.js'

describe('createClientsScopes', () => {
  test('maps configured PII and write client ids to their scopes', () => {
    expect(
      createClientsScopes({
        piiAllowed: ['pii-client'],
        writeAllowed: ['write-client']
      })
    ).toEqual([
      { client_id: 'pii-client', scopes: ['pii'] },
      { client_id: 'write-client', scopes: ['write'] }
    ])
  })

  test('allows a client to receive both scopes', () => {
    expect(
      createClientsScopes({
        piiAllowed: ['shared-client'],
        writeAllowed: ['shared-client']
      })
    ).toEqual([
      { client_id: 'shared-client', scopes: ['pii'] },
      { client_id: 'shared-client', scopes: ['write'] }
    ])
  })

  test('grants no scopes when both allowlists are empty', () => {
    expect(createClientsScopes({ piiAllowed: [], writeAllowed: [] })).toEqual(
      []
    )
  })
})

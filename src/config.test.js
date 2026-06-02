import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  afterAll,
  jest
} from '@jest/globals'

describe('config auth.allowedIssuers', () => {
  const ORIGINAL = process.env.AUTH_ALLOWED_ISSUERS

  beforeEach(() => {
    jest.resetModules()
    delete process.env.AUTH_ALLOWED_ISSUERS
  })

  afterEach(() => {
    delete process.env.AUTH_ALLOWED_ISSUERS
  })

  afterAll(() => {
    if (ORIGINAL === undefined) {
      delete process.env.AUTH_ALLOWED_ISSUERS
    } else {
      process.env.AUTH_ALLOWED_ISSUERS = ORIGINAL
    }
  })

  test('defaults to [] when AUTH_ALLOWED_ISSUERS is unset', async () => {
    delete process.env.AUTH_ALLOWED_ISSUERS

    const { config } = await import('./config.js')

    expect(config.get('auth.allowedIssuers')).toEqual([])
  })

  test('comma-splits AUTH_ALLOWED_ISSUERS into an array', async () => {
    process.env.AUTH_ALLOWED_ISSUERS =
      'https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_A,https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_B'

    const { config } = await import('./config.js')

    expect(config.get('auth.allowedIssuers')).toEqual([
      'https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_A',
      'https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_B'
    ])
  })

  test('treats a single issuer as a one-element array', async () => {
    process.env.AUTH_ALLOWED_ISSUERS =
      'https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_A'

    const { config } = await import('./config.js')

    expect(config.get('auth.allowedIssuers')).toEqual([
      'https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_A'
    ])
  })
})

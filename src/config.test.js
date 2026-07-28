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

describe('config samApi', () => {
  const SAM_ENV_VARS = [
    'SAM_API_BASE_URL',
    'SAM_API_WRITE_PATH',
    'SAM_API_TIMEOUT_MS',
    'SAM_API_ENTRA_TOKEN_URL',
    'SAM_API_ENTRA_CLIENT_ID',
    'SAM_API_ENTRA_CLIENT_SECRET',
    'SAM_API_ENTRA_SCOPE'
  ]

  const clearSamEnv = () => {
    for (const name of SAM_ENV_VARS) {
      delete process.env[name]
    }
  }

  const validSamEnv = () => {
    process.env.SAM_API_BASE_URL =
      'https://samapigwdb.app.defra.gov.uk/api/sam/v1'
    process.env.SAM_API_ENTRA_TOKEN_URL =
      'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token'
    process.env.SAM_API_ENTRA_CLIENT_ID = 'client-id'
    process.env.SAM_API_ENTRA_CLIENT_SECRET = 'client-secret'
    process.env.SAM_API_ENTRA_SCOPE = 'api://sam-app/.default'
  }

  beforeEach(() => {
    jest.resetModules()
    clearSamEnv()
  })

  afterEach(() => {
    clearSamEnv()
    jest.restoreAllMocks()
  })

  test('defaults: baseUrl null, placeholder writePath, 10s timeout', async () => {
    const { config } = await import('./config.js')

    expect(config.get('samApi')).toEqual({
      baseUrl: null,
      writePath: '/standardwork',
      requestTimeoutMs: 10000,
      entra: {
        tokenUrl: null,
        clientId: null,
        clientSecret: null,
        scope: null
      }
    })
    expect(config.get('isDevelopment')).toBe(false)
  })

  test('accepts a fully-configured samApi block', async () => {
    validSamEnv()
    process.env.SAM_API_WRITE_PATH = '/update-standard-activity'
    process.env.SAM_API_TIMEOUT_MS = '5000'

    const { config } = await import('./config.js')

    expect(config.get('samApi.baseUrl')).toBe(
      'https://samapigwdb.app.defra.gov.uk/api/sam/v1'
    )
    expect(config.get('samApi.writePath')).toBe('/update-standard-activity')
    expect(config.get('samApi.requestTimeoutMs')).toBe(5000)
  })

  test.each([
    [
      'an http URL',
      'SAM_API_BASE_URL',
      'http://samapigwdb.app.defra.gov.uk/api/sam/v1',
      /https/
    ],
    [
      'a URL with a query string',
      'SAM_API_BASE_URL',
      'https://sam.test/api?env=db',
      /query string or fragment/
    ],
    [
      'a URL with a fragment',
      'SAM_API_ENTRA_TOKEN_URL',
      'https://login.test/token#frag',
      /query string or fragment/
    ],
    [
      'a relative URL',
      'SAM_API_BASE_URL',
      'samapigwdb.app.defra.gov.uk',
      /absolute URL/
    ],
    [
      'a URL with a bare trailing ? (empty search survives concatenation)',
      'SAM_API_BASE_URL',
      'https://sam.test/api/sam/v1?',
      /query string or fragment/
    ],
    [
      'a URL with a bare trailing #',
      'SAM_API_BASE_URL',
      'https://sam.test/api/sam/v1#',
      /query string or fragment/
    ],
    [
      'a URL embedding credentials',
      'SAM_API_ENTRA_TOKEN_URL',
      'https://user:pass@login.test/tenant/oauth2/v2.0/token',
      /must not embed credentials/
    ]
  ])('rejects %s', async (_label, name, value, message) => {
    validSamEnv()
    process.env[name] = value

    await expect(import('./config.js')).rejects.toThrow(message)
  })

  test.each([
    ['without a leading slash', 'standardwork', /must start with \//],
    [
      'with a double leading slash',
      '//standardwork',
      /must not start with \/\//
    ],
    ['containing a query string', '/standardwork?x=1', /must not contain/],
    ['containing a fragment', '/standardwork#frag', /must not contain/],
    ['containing a .. segment', '/../admin', /path segments/],
    ['containing a . segment', '/./standardwork', /path segments/],
    ['ending in a .. segment', '/standardwork/..', /path segments/],
    [
      'containing percent-encoded dot segments',
      '/%2e%2e/admin',
      /percent-encoded/
    ]
  ])('rejects a writePath %s', async (_label, value, message) => {
    validSamEnv()
    process.env.SAM_API_WRITE_PATH = value

    await expect(import('./config.js')).rejects.toThrow(message)
  })

  test('rejects a non-natural timeout', async () => {
    validSamEnv()
    process.env.SAM_API_TIMEOUT_MS = '-5'

    await expect(import('./config.js')).rejects.toThrow()
  })

  describe('validateSamApiConfig', () => {
    const completeSamApi = () => ({
      baseUrl: 'https://sam.test/api/sam/v1',
      entra: {
        tokenUrl: 'https://login.test/token',
        clientId: 'id',
        clientSecret: 'secret',
        scope: 'api://sam/.default'
      }
    })

    test('is a no-op when baseUrl is unset', async () => {
      const { validateSamApiConfig } = await import('./config.js')
      const warn = jest.fn()

      validateSamApiConfig(
        { baseUrl: null, entra: completeSamApi().entra },
        { isProduction: true, warn }
      )

      expect(warn).not.toHaveBeenCalled()
    })

    test('is a no-op when the config is complete', async () => {
      const { validateSamApiConfig } = await import('./config.js')
      const warn = jest.fn()

      validateSamApiConfig(completeSamApi(), { isProduction: true, warn })

      expect(warn).not.toHaveBeenCalled()
    })

    test('throws in production naming only the missing keys', async () => {
      const { validateSamApiConfig } = await import('./config.js')
      const samApi = completeSamApi()

      samApi.entra.clientId = ''
      samApi.entra.clientSecret = '   '
      samApi.entra.scope = null

      expect(() =>
        validateSamApiConfig(samApi, { isProduction: true })
      ).toThrow(
        'SAM_API_BASE_URL is set but the EntraID credentials are incomplete: missing SAM_API_ENTRA_CLIENT_ID, SAM_API_ENTRA_CLIENT_SECRET, SAM_API_ENTRA_SCOPE'
      )
    })

    test('warns (not throws) outside production', async () => {
      const { validateSamApiConfig } = await import('./config.js')
      const samApi = completeSamApi()

      samApi.entra.tokenUrl = ''

      const warn = jest.fn()

      expect(() =>
        validateSamApiConfig(samApi, { isProduction: false, warn })
      ).not.toThrow()

      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0][0]).toContain('SAM_API_ENTRA_TOKEN_URL')
    })
  })
})

import convict from 'convict'
import convictFormatWithValidator from 'convict-format-with-validator'

import { convictValidateMongoUri } from './common/helpers/convict/validate-mongo-uri.js'

convict.addFormat(convictValidateMongoUri)
convict.addFormats(convictFormatWithValidator)

// Custom formats for the Sam write API config: https only (credentials and
// PII must never travel plaintext) and shapes that keep base-URL + path
// concatenation from ever targeting the wrong resource.
convict.addFormat({
  name: 'https-url',
  validate: (value) => {
    if (value === null || value === undefined) {
      return
    }

    let url

    try {
      url = new URL(value)
    } catch {
      throw new Error('must be an absolute URL')
    }

    if (url.protocol !== 'https:') {
      throw new Error('must use https://')
    }

    if (url.username !== '' || url.password !== '') {
      throw new Error('must not embed credentials')
    }

    // Check the raw string, not url.search/hash: a bare trailing '?' or
    // '#' parses to an EMPTY search/hash but still survives concatenation,
    // pushing the write path into the query/fragment.
    if (value.includes('?') || value.includes('#')) {
      throw new Error('must not contain a query string or fragment')
    }
  }
})

convict.addFormat({
  name: 'leading-slash-path',
  validate: (value) => {
    if (typeof value !== 'string' || !value.startsWith('/')) {
      throw new Error('must start with /')
    }

    if (value.startsWith('//')) {
      throw new Error('must not start with //')
    }

    if (value.includes('?') || value.includes('#')) {
      throw new Error('must not contain ? or #')
    }

    // '.'/'..' segments get canonicalised away at request time, silently
    // dropping base-path segments
    if (/(^|\/)\.\.?(\/|$)/.test(value)) {
      throw new Error('must not contain . or .. path segments')
    }

    // %2e%2e would smuggle the same dot segments past the check above —
    // and a legitimate resource path never needs percent-encoding anyway
    if (value.includes('%')) {
      throw new Error('must not contain percent-encoded characters')
    }
  }
})

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'
const isDevelopment = process.env.NODE_ENV === 'development'

const config = convict({
  oracledb: {
    pega: {
      username: {
        doc: 'PEGA Database Username',
        format: String,
        nullable: false,
        default: 'pega',
        env: 'ORACLEDB_SAM_SMDB_USERNAME'
      },
      password: {
        doc: 'PEGA Database Password',
        format: String,
        nullable: false,
        default: 'password',
        env: 'ORACLEDB_SAM_SMDB_PASSWORD'
      },
      host: {
        doc: 'PEGA Database host',
        format: String,
        nullable: false,
        default: 'localhost:1521',
        env: 'ORACLEDB_PEGA_HOST'
      },
      dbname: {
        doc: 'PEGA Database, Database name',
        format: String,
        nullable: false,
        default: 'FREEPDB1',
        env: 'ORACLEDB_PEGA_DBNAME'
      },
      poolMin: {
        doc: 'PEGA Database pool min',
        format: Number,
        default: 0,
        env: 'ORACLEDB_PEGA_POOL_MIN'
      },
      poolMax: {
        doc: 'PEGA Database pool max',
        format: Number,
        default: 1,
        env: 'ORACLEDB_PEGA_POOL_MAX'
      },
      poolTimeout: {
        doc: 'PEGA Database pool timeout',
        format: Number,
        default: 60,
        env: 'ORACLEDB_PEGA_POOL_TIMEOUT'
      },
      poolCloseWaitTime: {
        doc: 'PEGA Database pool closing wait time',
        format: Number,
        default: 0,
        env: 'ORACLEDB_PEGA_POOL_CLOSE_WAIT_TIME'
      },
      poolPingInterval: {
        doc: 'PEGA Database pool ping interval in seconds. Connections idle for longer than this value are tested with a round-trip to the database before use. Set to 0 to always test.',
        format: Number,
        default: 60,
        env: 'ORACLEDB_PEGA_POOL_PING_INTERVAL'
      },
      expireTime: {
        doc: 'PEGA Database keepalive probe interval in minutes. Set to a value greater than 0 to enable Oracle Net keepalive probes for idle connections.',
        format: Number,
        default: 1,
        env: 'ORACLEDB_PEGA_EXPIRE_TIME'
      }
    },
    sam: {
      username: {
        doc: 'SAM Database Username',
        format: String,
        nullable: false,
        default: 'sam',
        env: 'ORACLEDB_SAM_SMDB_USERNAME'
      },
      password: {
        doc: 'SAM Database Password',
        format: String,
        nullable: false,
        default: 'password',
        env: 'ORACLEDB_SAM_SMDB_PASSWORD'
      },
      host: {
        doc: 'SAM Database host',
        format: String,
        nullable: false,
        default: 'localhost:1521',
        env: 'ORACLEDB_SAM_SMDB_HOST'
      },
      dbname: {
        doc: 'SAM Database, Database name',
        format: String,
        nullable: false,
        default: 'FREEPDB1',
        env: 'ORACLEDB_SAM_SMDB_DBNAME'
      },
      poolMin: {
        doc: 'SAM Database pool min',
        format: Number,
        default: 0,
        env: 'ORACLEDB_SAM_SMDB_POOL_MIN'
      },
      poolMax: {
        doc: 'SAM Database pool max',
        format: Number,
        default: 1,
        env: 'ORACLEDB_SAM_SMDB_POOL_MAX'
      },
      poolTimeout: {
        doc: 'SAM Database pool timeout',
        format: Number,
        default: 60,
        env: 'ORACLEDB_SAM_SMDB_POOL_TIMEOUT'
      },
      poolCloseWaitTime: {
        doc: 'SAM Database pool closing wait time',
        format: Number,
        default: 0,
        env: 'ORACLEDB_SAM_SMDB_POOL_CLOSE_WAIT_TIME'
      },
      poolPingInterval: {
        doc: 'SAM Database pool ping interval in seconds. Connections idle for longer than this value are tested with a round-trip to the database before use. Set to 0 to always test.',
        format: Number,
        default: 60,
        env: 'ORACLEDB_SAM_SMDB_POOL_PING_INTERVAL'
      },
      expireTime: {
        doc: 'SAM Database keepalive probe interval in minutes. Set to a value greater than 0 to enable Oracle Net keepalive probes for idle connections.',
        format: Number,
        default: 1,
        env: 'ORACLEDB_SAM_SMDB_EXPIRE_TIME'
      }
    }
  },
  oracledbHealthcheck: {
    enabled: {
      doc: 'Enable the periodic OracleDB healthcheck',
      format: Boolean,
      default: true,
      env: 'ORACLEDB_HEALTHCHECK_ENABLED'
    },
    intervalMs: {
      doc: 'Interval between OracleDB healthcheck probes',
      format: 'nat',
      default: 30_000,
      env: 'ORACLEDB_HEALTHCHECK_INTERVAL_MS'
    },
    timeoutMs: {
      doc: 'Per-probe timeout; exceeding this is recorded as a failure',
      format: 'nat',
      default: 5_000,
      env: 'ORACLEDB_HEALTHCHECK_TIMEOUT_MS'
    }
  },
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  cdpEnv: {
    doc: 'The CDP environment the service is deployed to (e.g. dev, test, ext-test, perf-test, prod). "prod" is real production; every other value is a lower environment. Defaults to "local" when unset (local development and tests).',
    format: String,
    default: 'local',
    env: 'CDP_ENV'
  },
  /**
   * The CDP environment the service is deployed to is distinct from NODE_ENV,
   * which is "production" in *every* deployed CDP environment. CDP_ENV identifies
   * the specific environment (dev, test, ext-test, perf-test, prod) so behaviour
   * can differ between real production and the lower environments.
   */
  isLowerEnvironment: {
    doc: 'Whether the service is running in a lower (non-production) CDP environment. True whenever CDP_ENV is anything other than "prod", including when it is absent.',
    format: Boolean,
    default: process.env.CDP_ENV !== 'prod'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind',
    format: 'port',
    default: 3001,
    env: 'PORT'
  },
  serviceName: {
    doc: 'Api Service Name',
    format: String,
    default: 'apha-integration-bridge'
  },
  auth: {
    scope: {
      doc: 'The authentication scope required for the service',
      format: String,
      default: 'apha-integration-bridge-resource-srv/access',
      env: 'AUTH_SCOPE'
    },
    allowedIssuers: {
      doc: 'Comma-separated allowlist of exact trusted token issuer (iss) URLs. Each entry should be the full Cognito issuer including the pool id, e.g. https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_xxxxxxxxx (a trailing slash, if present, is stripped). Tokens whose iss is not an exact match are rejected before any JWKS fetch. MUST be set per environment; empty causes the server to refuse to start (deployed) or reject all tokens (local development).',
      format: Array,
      default: [],
      env: 'AUTH_ALLOWED_ISSUERS'
    }
  },
  log: {
    isEnabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: !isTest,
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : ['req', 'res', 'responseTime']
    }
  },
  mongo: {
    uri: {
      doc: 'URI for mongodb',
      format: String,
      default: 'mongodb://127.0.0.1:27017',
      env: 'MONGO_URI'
    },
    databaseName: {
      doc: 'Database name for mongodb',
      format: String,
      default: 'apha-integration-bridge',
      env: 'MONGO_DATABASE'
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy URL',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  isMetricsEnabled: {
    doc: 'Enable metrics reporting',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_METRICS'
  },
  tracing: {
    header: {
      doc: 'CDP tracing header name',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  salesforce: {
    baseUrl: {
      doc: 'Salesforce instance base URL (e.g. https://my-instance.my.salesforce.com)',
      format: 'url',
      nullable: true,
      default: null,
      env: 'SALESFORCE_BASE_URL'
    },
    authUrl: {
      doc: 'Salesforce OAuth2 token endpoint. Defaults to {baseUrl}/services/oauth2/token',
      format: 'url',
      nullable: true,
      default: null,
      env: 'SALESFORCE_AUTH_URL'
    },
    clientId: {
      doc: 'Salesforce connected app client id',
      format: String,
      nullable: true,
      default: null,
      env: 'SALESFORCE_CLIENT_ID'
    },
    clientSecret: {
      doc: 'Salesforce connected app client secret',
      format: String,
      nullable: true,
      default: null,
      sensitive: true,
      env: 'SALESFORCE_CLIENT_SECRET'
    },
    apiVersion: {
      doc: 'Salesforce API version to target (e.g. v62.0)',
      format: String,
      default: 'v62.0',
      env: 'SALESFORCE_API_VERSION'
    },
    requestTimeoutMs: {
      doc: 'HTTP timeout in milliseconds for Salesforce calls',
      format: Number,
      default: 10000,
      env: 'SALESFORCE_TIMEOUT_MS'
    },
    jwt: {
      privateKey: {
        doc: 'Base64-encoded private key for JWT Bearer flow',
        format: String,
        nullable: true,
        default: null,
        sensitive: true,
        env: 'SALESFORCE_JWT_PRIVATE_KEY'
      },
      consumerKey: {
        doc: 'Salesforce Connected App consumer key (client_id) for JWT Bearer flow',
        format: String,
        nullable: true,
        default: null,
        env: 'SALESFORCE_JWT_CONSUMER_KEY'
      }
    }
  },
  samApi: {
    baseUrl: {
      doc: 'Base URL of the Sam write API gateway, e.g. https://samapigwdb.app.defra.gov.uk/api/sam/v1. When unset, PATCH /workorders/activity fails closed (503) in every environment; the mock endpoints under /alpha are unaffected by this config.',
      format: 'https-url',
      nullable: true,
      default: null,
      env: 'SAM_API_BASE_URL'
    },
    writePath: {
      doc: 'Resource path of the Sam standard-work write endpoint, appended to baseUrl. The default is a placeholder derived from the StandardWork API name — confirm the real path against the Pega elaboration document before enabling any environment.',
      format: 'leading-slash-path',
      default: '/standardwork',
      env: 'SAM_API_WRITE_PATH'
    },
    requestTimeoutMs: {
      doc: 'Timeout per outbound request: the EntraID token POST and the Sam PATCH each get their own budget. Worst case end-to-end for one bridge request is ~4x this value (cold token + PATCH + token re-fetch + single retry after a first Sam 401).',
      format: 'nat',
      default: 10000,
      env: 'SAM_API_TIMEOUT_MS'
    },
    entra: {
      tokenUrl: {
        doc: 'Full EntraID (Azure AD) OAuth2 v2 token endpoint URL, including the tenant segment.',
        format: 'https-url',
        nullable: true,
        default: null,
        env: 'SAM_API_ENTRA_TOKEN_URL'
      },
      clientId: {
        doc: 'EntraID application (client) id used for the client-credentials grant.',
        format: String,
        nullable: true,
        default: null,
        env: 'SAM_API_ENTRA_CLIENT_ID'
      },
      clientSecret: {
        doc: 'EntraID client secret used for the client-credentials grant.',
        format: String,
        nullable: true,
        default: null,
        sensitive: true,
        env: 'SAM_API_ENTRA_CLIENT_SECRET'
      },
      scope: {
        doc: "OAuth2 scope requested in the client-credentials grant, normally the Sam application's ID URI plus /.default (e.g. api://<sam-app-id>/.default).",
        format: String,
        nullable: true,
        default: null,
        env: 'SAM_API_ENTRA_SCOPE'
      }
    }
  },
  aws: {
    region: {
      doc: 'AWS region to use',
      format: String,
      default: 'eu-west-2',
      env: 'AWS_REGION'
    },
    s3Endpoint: {
      doc: 'AWS S3 endpoint',
      format: String,
      default: 'http://127.0.0.1:4566',
      env: 'S3_ENDPOINT'
    },
    bucket: {
      format: String,
      default: null,
      nullable: true,
      env: 'S3_BUCKET'
    }
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDevelopment
  },
  cognito: {
    tokenUrl: {
      doc: 'Cognito OAuth2 token endpoint URL. Only used in lower environments for /oauth2/token endpoint.',
      format: String,
      nullable: true,
      default: null,
      env: 'COGNITO_TOKEN_URL'
    }
  },
  featureFlags: {
    isTokenEndpointEnabled: {
      doc: 'Enable /oauth2/token endpoint (lower environments only)',
      format: Boolean,
      default: !isProduction,
      env: 'COGNITO_TOKEN_ENDPOINT_ENABLED'
    },
    isCaseManagementEnabled: {
      doc: 'Enable case management (Salesforce) endpoints',
      format: Boolean,
      default: !isProduction,
      env: 'CASE_MANAGEMENT_ENABLED'
    }
  },
  pagination: {
    maxPageSize: {
      doc: 'Maximum page size allowed for paginated endpoints',
      format: Number,
      default: 50,
      env: 'PAGINATION_MAX_PAGE_SIZE'
    }
  },
  clients: {
    path: {
      doc: 'Path to the clients config (JSONC)',
      format: String,
      default: './clients.jsonc',
      env: 'CLIENTS_PATH'
    }
  },
  rateLimit: {
    points: {
      doc: 'Maximum number of requests allowed per duration window per client',
      format: Number,
      default: 10,
      env: 'RATE_LIMIT_POINTS'
    },
    duration: {
      doc: 'Duration window in seconds for rate limiting',
      format: Number,
      default: 1,
      env: 'RATE_LIMIT_DURATION'
    }
  }
})

config.validate({ allowed: 'strict' })

// Env-var name per samApi.entra key. Error messages name the missing KEY
// only — never echo a (possibly whitespace) secret value into logs.
// Exported so the client's request-time check uses the same map.
export const SAM_ENTRA_ENV_VARS = {
  tokenUrl: 'SAM_API_ENTRA_TOKEN_URL',
  clientId: 'SAM_API_ENTRA_CLIENT_ID',
  clientSecret: 'SAM_API_ENTRA_CLIENT_SECRET',
  scope: 'SAM_API_ENTRA_SCOPE'
}

/**
 * Fail loud on a half-configured Sam write API: with SAM_API_BASE_URL set,
 * all four Entra values are required (missing/empty/whitespace all count as
 * absent). Throws in production — every deployed CDP env — so a bad deploy
 * dies at boot instead of 500ing per request; warns in local dev. Inputs are
 * parameters so tests can drive the production path.
 *
 * @param {{ baseUrl: string | null, entra: Record<string, string | null> }} samApi
 * @param {{ isProduction?: boolean, warn?: (message: string) => void }} [options]
 */
export function validateSamApiConfig(
  samApi,
  { isProduction: isProductionEnv = false, warn = console.warn } = {}
) {
  if (typeof samApi.baseUrl !== 'string' || samApi.baseUrl.trim() === '') {
    return
  }

  const missing = Object.entries(SAM_ENTRA_ENV_VARS)
    .filter(([key]) => {
      const value = samApi.entra[key]

      return typeof value !== 'string' || value.trim() === ''
    })
    .map(([, envVar]) => envVar)

  if (missing.length === 0) {
    return
  }

  const message = `SAM_API_BASE_URL is set but the EntraID credentials are incomplete: missing ${missing.join(', ')}`

  if (isProductionEnv) {
    throw new Error(message)
  }

  warn(message)
}

validateSamApiConfig(config.get('samApi'), { isProduction })

export { config }

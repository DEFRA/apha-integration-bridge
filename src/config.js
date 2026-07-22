import convict from 'convict'
import convictFormatWithValidator from 'convict-format-with-validator'

import { convictValidateMongoUri } from './common/helpers/convict/validate-mongo-uri.js'

convict.addFormat(convictValidateMongoUri)
convict.addFormats(convictFormatWithValidator)

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
        doc: 'PEGA Database pool ping interval in seconds. Connections idle for longer than this value are tested with a round-trip to the database before use. Set to 0 to always test. Negative values disable pinging (driver sentinel).',
        format: 'int',
        default: 60,
        env: 'ORACLEDB_PEGA_POOL_PING_INTERVAL'
      },
      expireTime: {
        doc: 'PEGA Database keepalive probe interval in minutes. Set to a value greater than 0 to enable Oracle Net keepalive probes for idle connections.',
        format: Number,
        default: 1,
        env: 'ORACLEDB_PEGA_EXPIRE_TIME'
      },
      connectTimeout: {
        doc: 'PEGA Database Easy Connect connect_timeout in SECONDS — bounds transport establishment and the TNS connect phase. Authentication happens after this window; the pool queueTimeoutMs bounds the caller through auth at acquire time. Range 1-300.',
        format: 'int',
        default: 10,
        env: 'ORACLEDB_PEGA_CONNECT_TIMEOUT'
      },
      transportConnectTimeout: {
        doc: 'PEGA Database Easy Connect transport_connect_timeout in SECONDS — bounds TCP/TLS transport establishment only. Must be <= connectTimeout. Range 1-300.',
        format: 'int',
        default: 5,
        env: 'ORACLEDB_PEGA_TRANSPORT_CONNECT_TIMEOUT'
      },
      retryCount: {
        doc: 'PEGA Database Easy Connect retry_count — additional full connection attempts after the first. Must be 0 for multi-host connect strings. Range 0-2.',
        format: 'int',
        default: 0,
        env: 'ORACLEDB_PEGA_RETRY_COUNT'
      },
      queueTimeoutMs: {
        doc: 'PEGA Database pool queueTimeout in MILLISECONDS — how long a getConnection call may wait in the pool queue before rejecting. 0 (wait forever) is not allowed. Range 1000-60000.',
        format: 'int',
        default: 10_000,
        env: 'ORACLEDB_PEGA_QUEUE_TIMEOUT_MS'
      },
      queueMax: {
        doc: 'PEGA Database pool queueMax — maximum queued getConnection requests; 0 means fail-fast with no queued waiters. When unset, derived as min(500, max(25, 2 * poolMax)). Range 0-500.',
        format: 'int',
        nullable: true,
        default: null,
        env: 'ORACLEDB_PEGA_QUEUE_MAX'
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
        doc: 'SAM Database pool ping interval in seconds. Connections idle for longer than this value are tested with a round-trip to the database before use. Set to 0 to always test. Negative values disable pinging (driver sentinel).',
        format: 'int',
        default: 60,
        env: 'ORACLEDB_SAM_SMDB_POOL_PING_INTERVAL'
      },
      expireTime: {
        doc: 'SAM Database keepalive probe interval in minutes. Set to a value greater than 0 to enable Oracle Net keepalive probes for idle connections.',
        format: Number,
        default: 1,
        env: 'ORACLEDB_SAM_SMDB_EXPIRE_TIME'
      },
      connectTimeout: {
        doc: 'SAM Database Easy Connect connect_timeout in SECONDS — bounds transport establishment and the TNS connect phase. Authentication happens after this window; the pool queueTimeoutMs bounds the caller through auth at acquire time. Range 1-300.',
        format: 'int',
        default: 10,
        env: 'ORACLEDB_SAM_SMDB_CONNECT_TIMEOUT'
      },
      transportConnectTimeout: {
        doc: 'SAM Database Easy Connect transport_connect_timeout in SECONDS — bounds TCP/TLS transport establishment only. Must be <= connectTimeout. Range 1-300.',
        format: 'int',
        default: 5,
        env: 'ORACLEDB_SAM_SMDB_TRANSPORT_CONNECT_TIMEOUT'
      },
      retryCount: {
        doc: 'SAM Database Easy Connect retry_count — additional full connection attempts after the first. Must be 0 for multi-host connect strings. Range 0-2.',
        format: 'int',
        default: 0,
        env: 'ORACLEDB_SAM_SMDB_RETRY_COUNT'
      },
      queueTimeoutMs: {
        doc: 'SAM Database pool queueTimeout in MILLISECONDS — how long a getConnection call may wait in the pool queue before rejecting. 0 (wait forever) is not allowed. Range 1000-60000.',
        format: 'int',
        default: 10_000,
        env: 'ORACLEDB_SAM_SMDB_QUEUE_TIMEOUT_MS'
      },
      queueMax: {
        doc: 'SAM Database pool queueMax — maximum queued getConnection requests; 0 means fail-fast with no queued waiters. When unset, derived as min(500, max(25, 2 * poolMax)). Range 0-500.',
        format: 'int',
        nullable: true,
        default: null,
        env: 'ORACLEDB_SAM_SMDB_QUEUE_MAX'
      }
    }
  },
  ecsStopTimeoutMs: {
    doc: 'The ECS task stopTimeout in MILLISECONDS (SIGTERM-to-SIGKILL window). ECS does not expose this to the container, so the IaC/CDP task definition MUST keep this env var in sync with the task stopTimeout — shutdown-budget validation depends on it.',
    format: 'int',
    default: 30_000,
    env: 'ECS_STOP_TIMEOUT_MS'
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

export { config }

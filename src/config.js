import convict from 'convict'
import convictFormatWithValidator from 'convict-format-with-validator'

import { convictValidateMongoUri } from './common/helpers/convict/validate-mongo-uri.js'

convict.addFormat(convictValidateMongoUri)
convict.addFormats(convictFormatWithValidator)

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

const config = convict({
  oracledb: {
    // pega: {
    //   username: {
    //     doc: 'PEGA Database Username',
    //     format: String,
    //     nullable: false,
    //     default: 'pega',
    //     env: 'ORACLEDB_PEGA_USERNAME'
    //   },
    //   password: {
    //     doc: 'PEGA Database Password',
    //     format: String,
    //     nullable: false,
    //     default: 'password',
    //     env: 'ORACLEDB_PEGA_PASSWORD'
    //   },
    //   host: {
    //     doc: 'PEGA Database host',
    //     format: String,
    //     nullable: false,
    //     default: 'localhost:1521',
    //     env: 'ORACLEDB_PEGA_HOST'
    //   },
    //   dbname: {
    //     doc: 'PEGA Database, Database name',
    //     format: String,
    //     nullable: false,
    //     default: 'FREEPDB1',
    //     env: 'ORACLEDB_PEGA_DBNAME'
    //   },
    //   poolMin: {
    //     doc: 'PEGA Database pool min',
    //     format: Number,
    //     default: 0,
    //     env: 'ORACLEDB_PEGA_POOL_MIN'
    //   },
    //   poolMax: {
    //     doc: 'PEGA Database pool max',
    //     format: Number,
    //     default: 1,
    //     env: 'ORACLEDB_PEGA_POOL_MAX'
    //   },
    //   poolTimeout: {
    //     doc: 'PEGA Database pool timeout',
    //     format: Number,
    //     default: 60,
    //     env: 'ORACLEDB_PEGA_POOL_TIMEOUT'
    //   },
    //   poolCloseWaitTime: {
    //     doc: 'PEGA Database pool closing wait time',
    //     format: Number,
    //     default: 0,
    //     env: 'ORACLEDB_PEGA_POOL_CLOSE_WAIT_TIME'
    //   }
    // },
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
      }
    }
  },
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
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
  cdpEnvironment: {
    doc: 'The CDP environment the app is running in. With the addition of "local" for local development',
    format: [
      'local',
      'infra-dev',
      'management',
      'dev',
      'test',
      'perf-test',
      'ext-test',
      'prod'
    ],
    default: 'local',
    env: 'ENVIRONMENT'
  },
  auth: {
    scope: {
      doc: 'The authentication scope required for the service',
      format: String,
      default: 'apha-integration-bridge-resource-srv/access',
      env: 'AUTH_SCOPE'
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
  }
})

config.validate({ allowed: 'strict' })

export { config }

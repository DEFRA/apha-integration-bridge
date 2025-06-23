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
        env: 'ORACLEDB_SAM_USERNAME'
      },
      password: {
        doc: 'SAM Database Password',
        format: String,
        nullable: false,
        default: 'password',
        env: 'ORACLEDB_SAM_PASSWORD'
      },
      host: {
        doc: 'SAM Database host',
        format: String,
        nullable: false,
        default: 'localhost:1521',
        env: 'ORACLEDB_SAM_HOST'
      },
      dbname: {
        doc: 'SAM Database, Database name',
        format: String,
        nullable: false,
        default: 'FREEPDB1',
        env: 'ORACLEDB_SAM_DBNAME'
      },
      poolMin: {
        doc: 'SAM Database pool min',
        format: Number,
        default: 0,
        env: 'ORACLEDB_SAM_POOL_MIN'
      },
      poolMax: {
        doc: 'SAM Database pool max',
        format: Number,
        default: 1,
        env: 'ORACLEDB_SAM_POOL_MAX'
      },
      poolTimeout: {
        doc: 'SAM Database pool timeout',
        format: Number,
        default: 60,
        env: 'ORACLEDB_SAM_POOL_TIMEOUT'
      },
      poolCloseWaitTime: {
        doc: 'SAM Database pool closing wait time',
        format: Number,
        default: 0,
        env: 'ORACLEDB_SAM_POOL_CLOSE_WAIT_TIME'
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
  }
})

config.validate({ allowed: 'strict' })

export { config }

import oracledb from 'oracledb'

/**
 * ensure aws-embedded-metrics is initialized to push to stdout
 */
process.env.AWS_EMF_ENVIRONMENT = 'Local'

/**
 * disable the periodic OracleDB healthcheck in tests so it doesn't probe
 * real/mocked pools during unrelated server boots
 */
process.env.ORACLEDB_HEALTHCHECK_ENABLED = 'false'

if (process.env.ORACLE_CLIENT_LIB_DIR) {
  /**
   * @see https://www.oracle.com/database/technologies/instant-client/downloads.html
   */
  oracledb.initOracleClient({
    libDir: process.env.ORACLE_CLIENT_LIB_DIR
  })
}

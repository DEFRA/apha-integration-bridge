import oracledb from 'oracledb'

/**
 * ensure aws-embedded-metrics is initialized to push to stdout
 */
process.env.AWS_EMF_ENVIRONMENT = 'Local'

if (process.env.ORACLE_CLIENT_LIB_DIR) {
  /**
   * @see https://www.oracle.com/database/technologies/instant-client/downloads.html
   */
  oracledb.initOracleClient({
    libDir: process.env.ORACLE_CLIENT_LIB_DIR
  })
}

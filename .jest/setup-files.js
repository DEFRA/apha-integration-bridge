import oracledb from 'oracledb'

if (process.env.ORACLE_CLIENT_LIB_DIR) {
  /**
   * @see https://www.oracle.com/database/technologies/instant-client/downloads.html
   */
  oracledb.initOracleClient({
    libDir: process.env.ORACLE_CLIENT_LIB_DIR
  })
}

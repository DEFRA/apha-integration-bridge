import oracledb from 'oracledb'

/**
 * ensure aws-embedded-metrics is initialized to push to stdout
 */
process.env.AWS_EMF_ENVIRONMENT = 'Local'

/**
 * disable OTLP exporting during tests to avoid background exporter activity
 * that can continue after Jest has started environment teardown
 */
delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT

if (process.env.ORACLE_CLIENT_LIB_DIR) {
  /**
   * @see https://www.oracle.com/database/technologies/instant-client/downloads.html
   */
  oracledb.initOracleClient({
    libDir: process.env.ORACLE_CLIENT_LIB_DIR
  })
}

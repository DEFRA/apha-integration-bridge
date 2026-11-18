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

/**
 * never let tests call a live model: a key in the developer's shell would
 * otherwise turn the alpha customers tests into paid Anthropic API calls.
 * Tests that exercise extraction inject a fake model instead.
 */
delete process.env.ANTHROPIC_API_KEY

/**
 * Provide a trusted issuer allowlist for the auth plugin. Tests run with
 * NODE_ENV=test (isDevelopment === false), so the auth plugin throws at
 * registration when AUTH_ALLOWED_ISSUERS is empty — which would break any
 * test that boots the full server (e.g. start-server.test.js). This value
 * matches the ISSUER constant used by auth.test.js.
 */
process.env.AUTH_ALLOWED_ISSUERS =
  'https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_TEST'

if (process.env.ORACLE_CLIENT_LIB_DIR) {
  /**
   * @see https://www.oracle.com/database/technologies/instant-client/downloads.html
   */
  oracledb.initOracleClient({
    libDir: process.env.ORACLE_CLIENT_LIB_DIR
  })
}

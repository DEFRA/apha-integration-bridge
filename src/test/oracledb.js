import { beforeAll } from '@jest/globals'
import { GenericContainer } from 'testcontainers'

export const createOracleDbTestContainer = () => {
  /**
   * create a new test container for oracledb
   *
   * @note the docker daemon needs to have a valid login for oracle container registry
   */
  const container = new GenericContainer(
    'container-registry.oracle.com/database/free:latest'
  )
    .withExposedPorts(1521)
    /**
     * run the necessary startup sql scripts
     */
    .withCopyDirectoriesToContainer([
      {
        source: './compose/oracledb',
        target: '/opt/oracle/scripts/startup'
      }
    ])
    .withStartupTimeout(10_000)

  /**
   * @type {Promise<import('testcontainers').StartedTestContainer>}
   */
  const started = container.start()

  beforeAll(async () => {
    await started
  })

  /**
   * @returns {Promise<Object>} the configuration for the oracledb test container
   */
  const getConfiguration = async () => {
    const runningContainer = await started

    return {
      host: `0.0.0.0:${runningContainer.getMappedPort(1521)}`
    }
  }

  return {
    getConfiguration
  }
}

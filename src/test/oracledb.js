import oracledb from 'oracledb'
import { GenericContainer, Wait } from 'testcontainers'

export const getTestContainer = () => {
  return (
    new GenericContainer('container-registry.oracle.com/database/free:latest')
      .withExposedPorts(1521)
      /**
       * run the necessary startup sql scripts
       */
      .withBindMounts([
        {
          source: `${process.cwd()}/.docker-compose/oracledb`,
          target: '/opt/oracle/scripts/startup',
          mode: 'ro'
        }
      ])
      .withEnvironment({
        ORACLE_PW: 'letmein'
      })
      .withStartupTimeout(60_000)
      .withWaitStrategy(
        Wait.forLogMessage('DONE: Executing user defined scripts')
      )
  )
}

/**
 * @param {GenericContainer} container
 */
export const getContainerHost = async (container) => {
  const runningContainer = await container.start()

  return `0.0.0.0:${runningContainer.getMappedPort(1521)}`
}

/**
 * @param {GenericContainer} container
 * @param {{ username: string; password: string; dbname: string }} config
 */
export const getConnection = async (container, config) => {
  const host = await getContainerHost(container)

  const pool = await oracledb.createPool({
    user: config.username,
    password: config.password,
    connectString: `${host}/${config.dbname}`,
    poolAlias: 'sam'
  })

  const connection = await pool.getConnection()

  return {
    connection,
    [Symbol.asyncDispose]: async () => {
      try {
        await connection.close()
      } finally {
        await pool.close(0)
      }
    }
  }
}

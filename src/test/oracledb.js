import oracledb from 'oracledb'
// import { beforeAll, afterAll } from '@jest/globals'
// import { GenericContainer, Wait } from 'testcontainers'

/**
 * create a new test container for oracledb
 *
 * @note the docker daemon needs to have a valid login for oracle container registry
 */
// global.container = new GenericContainer(
//   'container-registry.oracle.com/database/free:latest'
// )
//   .withExposedPorts(1521)
//   /**
//    * run the necessary startup sql scripts
//    */
//   .withCopyDirectoriesToContainer([
//     {
//       source: './compose/oracledb',
//       target: '/opt/oracle/scripts/startup'
//     }
//   ])
//   .withEnvironment({
//     ORACLE_PW: 'letmein'
//   })
//   .withStartupTimeout(30_000)
//   .withWaitStrategy(Wait.forLogMessage('DONE: Executing user defined scripts'))

// const started = global.container.start()

// beforeAll(async () => {
//   await started
// }, 60_000)

export const getConfiguration = async () => {
  // const runningContainer = await started

  return {
    host: `0.0.0.0:1521`
  }
}

export const getConnection = async (config) => {
  const { host } = await getConfiguration()

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

// export const createOracleDbTestContainer = () => {
//   /**
//    * @type {Promise<import('testcontainers').StartedTestContainer>}
//    */
//   const started = container.start()

//   beforeAll(async () => {
//     await started
//   }, 60_000)

//   afterAll(async () => {
//     const runningContainer = await started

//     runningContainer.

//     await runningContainer.stop()
//   })

//   /**
//    * @returns {Promise<Object>} the configuration for the oracledb test container
//    */
//   const getConfiguration = async () => {
//     const runningContainer = await started

//     return {
//       host: `0.0.0.0:${runningContainer.getMappedPort(1521)}`
//     }
//   }

//   return {
//     getConfiguration,
//     getConnection: async (config) => {
//       const { host } = await getConfiguration()

//       const pool = await oracledb.createPool({
//         user: config.username,
//         password: config.password,
//         connectString: `${host}/${config.dbname}`,
//         poolAlias: 'sam'
//       })

//       const connection = await pool.getConnection()

//       return {
//         connection,
//         [Symbol.asyncDispose]: async () => {
//           try {
//             await connection.close()
//           } finally {
//             await pool.close(0)
//           }
//         }
//       }
//     }
//   }
// }

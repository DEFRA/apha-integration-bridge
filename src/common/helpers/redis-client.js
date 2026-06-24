import IORedis from 'ioredis'

const { default: Redis, Cluster } = IORedis

/**
 * Creates a Redis client (single instance or cluster) based on configuration
 *
 * @param {object} redisConfig - Redis configuration object
 * @param {string} redisConfig.host - Redis host
 * @param {number} redisConfig.port - Redis port
 * @param {number} [redisConfig.db] - Redis database number
 * @param {string} [redisConfig.keyPrefix] - Key prefix for all keys
 * @param {string} [redisConfig.username] - Redis username (ACL)
 * @param {string} [redisConfig.password] - Redis password
 * @param {boolean} [redisConfig.useTLS] - Use TLS connection
 * @param {boolean} [redisConfig.useSingleInstanceCache] - Use single instance vs cluster
 * @param {object} [logger] - logger instance
 * @returns {IORedis.Redis | IORedis.Cluster} Redis client instance
 */
export function buildRedisClient(redisConfig, logger) {
  const port = redisConfig.port ?? 6379
  const db = redisConfig.db ?? 0
  const keyPrefix = redisConfig.keyPrefix
  const host = redisConfig.host

  const credentials =
    redisConfig.username === '' || !redisConfig.username
      ? {}
      : {
          username: redisConfig.username,
          password: redisConfig.password
        }

  const tls = redisConfig.useTLS ? { tls: {} } : {}

  let redisClient

  if (redisConfig.useSingleInstanceCache) {
    redisClient = new Redis({
      port,
      host,
      db,
      keyPrefix,
      enableReadyCheck: false,
      ...credentials,
      ...tls
    })
  } else {
    redisClient = new Cluster([{ host, port }], {
      keyPrefix,
      slotsRefreshTimeout: 10000,
      dnsLookup: (address, callback) => callback(null, address),
      redisOptions: {
        enableReadyCheck: false,
        db,
        ...credentials,
        ...tls
      }
    })
  }

  redisClient.on('connect', () => {
    logger?.info(`Connected to Redis server at ${host}:${port}`)
  })

  redisClient.on('error', (error) => {
    logger?.error({ err: error }, 'Redis connection error')
  })

  return redisClient
}

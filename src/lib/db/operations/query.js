import knex from 'knex'

/**
 * @returns a query builder instance compatible with OracleDB
 */
export function query() {
  return knex({
    client: 'oracledb',
    /**
     * override the original quote identifier function to simply return the plain value
     * without any wrapping, as OracleDB does not support the same quoting mechanism
     * as other databases like PostgreSQL or MySQL.
     */
    wrapIdentifier: (value) => {
      return value
    }
  })
}

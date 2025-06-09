import OracleDB from 'oracledb'

/**
 * execute a sql query against the supplied connection
 *
 * @param {import('oracledb').Connection} connection - the oracledb connection to use
 * @param {import('knex').Knex.Sql} query - a knex query builder instance
 */
export async function execute(connection, query) {
  let index = 0

  const sql = query.sql.replace(/\?/g, () => {
    index += 1
    /**
     * replace the '?' with ':0', ':1', etc. to match OracleDB's named binding
     * syntax, as it does not support positional bindings like Knex does.
     *
     * @note knex does not support named bindings
     */
    return `:${index}`
  })

  /**
   * @type {OracleDB.Result<any>}
   */
  try {
    // @ts-ignore - OracleDB does not have a type definition for `execute` that matches the usage here
    const results = await connection.execute(sql, query.bindings, {
      outFormat: OracleDB.OUT_FORMAT_OBJECT,
      fetchTypeHandler: function (metadata) {
        /**
         * ensure column names are in lowercase
         */
        metadata.name = metadata.name.toLowerCase()
      }
    })

    return results.rows
  } catch (error) {
    console.error('Error executing SQL:', error)
    throw error
  }
}

import OracleDB from 'oracledb'
import { context, trace } from '@opentelemetry/api'

import { meter, tracer } from '../../telemetry/index.js'

/**
 * Gauge to track the latency of executing a SQL query against OracleDB
 */
const latencyGauge = meter.createGauge('oracledb_connection_execute_latency', {
  description: 'The latency of executing a SQL query against OracleDB',
  unit: 'Milliseconds'
})

/**
 * execute a sql query against the supplied connection
 *
 * @typedef {Record<string, Array<(value: unknown) => unknown>>} Marshallers
 * @typedef {{ sql: string; bindings: readonly unknown[]; marshallers?: Marshallers }} Query
 *
 * @param {import('oracledb').Connection} connection - the oracledb connection to use
 * @param {Query} query - a knex query builder instance
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
  return context.with(
    trace.setSpan(context.active(), trace.getActiveSpan()),
    async () => {
      const startTime = Date.now()

      return tracer.startActiveSpan('oracledb#execute', async (span) => {
        try {
          // @ts-ignore - OracleDB does not have a type definition for `execute` that matches the usage here
          const results = await connection.execute(sql, query.bindings, {
            outFormat: OracleDB.OUT_FORMAT_OBJECT,
            fetchTypeHandler: function (metadata) {
              /**
               * always lowercase the column names
               */
              metadata.name = metadata.name.toLowerCase()

              /**
               * if a marshaller is defined for this column, return a converter function
               * that applies the marshaller to the value
               */
              const marshaller = query.marshallers?.[metadata.name]

              if (marshaller) {
                return {
                  converter: (value) => {
                    return marshaller.reduce((intermediateValue, fn) => {
                      return fn(intermediateValue)
                    }, value)
                  }
                }
              }
            }
          })

          return results.rows
        } catch (error) {
          span.recordException(error)
          span.setStatus({ code: 2, message: error.message })

          throw error
        } finally {
          span.end()

          const latency = Date.now() - startTime

          latencyGauge.record(latency)
        }
      })
    }
  )
}

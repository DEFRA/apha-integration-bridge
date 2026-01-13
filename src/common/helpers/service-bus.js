import { ServiceBusClient } from '@azure/service-bus'

import { config } from '../../config.js'
import { salesforceClient } from '../../lib/salesforce/client.js'
import { processMessage } from '../../lib/service-bus/process-message.js'
import { processError } from '../../lib/service-bus/process-error.js'
import { resolveEntityPath } from '../../lib/service-bus/utils.js'

const serviceBusConfig = config.get('serviceBus')

export const serviceBus = {
  plugin: {
    name: 'service-bus',
    version: '0.0.0',
    /**
     * @param {import('@hapi/hapi').Server} server
     */
    register: async function (server) {
      if (!serviceBusConfig.enabled) {
        // Keep the listener fully opt-in so local/dev without SB creds doesn't fail boot
        server.logger.info('Service Bus listener disabled')

        return
      }

      if (!serviceBusConfig.connectionString) {
        // Fail soft if env misconfigured; avoids crashing the API while surfacing the issue
        server.logger.warn(
          'Service Bus enabled but no connection string configured - listener not started'
        )

        return
      }

      const entityPath = resolveEntityPath(serviceBusConfig.connectionString)
      const subscriptionName = serviceBusConfig.subscriptionName

      if (!entityPath) {
        // EntityPath must be present; avoiding guessing queues/topics prevents silent misroutes
        throw new Error(
          'Service Bus entity path is missing (include EntityPath in the connection string)'
        )
      }

      if (!subscriptionName) {
        // Topic consumers must specify a subscription explicitly
        throw new Error(
          'Service Bus subscription name is missing (set SERVICEBUS_SUBSCRIPTION)'
        )
      }

      const client = new ServiceBusClient(serviceBusConfig.connectionString)

      const receiver = client.createReceiver(entityPath, subscriptionName, {
        maxAutoLockRenewalDurationInMs: serviceBusConfig.maxAutoLockRenewalMs
      })

      let subscription

      server.ext('onPostStart', async () => {
        server.logger.info(
          {
            entityPath,
            subscriptionName,
            namespace: client.fullyQualifiedNamespace
          },
          'Starting Service Bus listener'
        )

        subscription = receiver.subscribe(
          {
            processMessage: (message) => {
              return processMessage({
                message,
                receiver,
                logger: server.logger,
                entityPath,
                maxDeliveryCount: serviceBusConfig.maxDeliveryCount,
                salesforceClient
              })
            },
            processError: (args) => {
              return processError({
                error: args.error,
                logger: server.logger,
                entityPath
              })
            }
          },
          {
            autoCompleteMessages: false,
            maxConcurrentCalls: serviceBusConfig.maxConcurrentCalls
          }
        )
      })

      server.ext('onPreStop', async () => {
        server.logger.info('Stopping Service Bus listener')

        await subscription?.close()
        await receiver.close()
        await client.close()
      })
    }
  }
}

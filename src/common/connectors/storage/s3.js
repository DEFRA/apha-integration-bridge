import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { config } from '../../../config.js'

/**
 * @import {GetObjectCommandOutput} from '@aws-sdk/client-s3'
 */

const { region, s3Endpoint } = config.get('aws')

export const client = new S3Client({
  region,
  endpoint: s3Endpoint,
  forcePathStyle: config.get('isDevelopment')
})

/**
 * @param {string} path
 * @returns {Promise<GetObjectCommandOutput>} Resolves when the message has been sent or logs an error if sending fails.
 */
export const retrieveFile = async (path) => {
  const command = new GetObjectCommand({
    Bucket: config.get('aws').bucket ?? '',
    Key: path
  })
  return client.send(command)
}

export const closeS3Client = () => client.destroy()

import { retrieveFile } from '../../../common/connectors/storage/s3.js'

/**
 * @import {Readable} from 'stream'
 */

/**
 * @typedef {{file: Buffer<ArrayBufferLike>, extension: string}} FileData
 */

/**
 * @param {string} path
 * @returns {Promise<FileData>}
 */
export const fetchFile = async (path) => {
  const obj = await retrieveFile(path)
  const chunks = []
  for await (const chunk of /** @type {Readable} */ (obj.Body)) {
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)

  return {
    file: buffer,
    extension: getFileExtension(obj.ContentType)
  }
}

/**
 * @param {string} contentType
 * @returns {string}
 */
export const getFileExtension = (contentType) => {
  const contentTypeMap = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png'
  }

  return contentTypeMap[contentType] || ''
}

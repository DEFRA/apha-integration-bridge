/**
 * @type {import('@hapi/hapi').ServerRoute['options']}
 */
export const options = {
  auth: false
}

export const handler = (_request, h) => h.response({ message: 'success' })

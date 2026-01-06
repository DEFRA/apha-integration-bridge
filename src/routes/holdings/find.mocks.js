import { HTTPObjectResponse } from '../../lib/http/http-response.js'

export const holding1 = new HTTPObjectResponse('holdings', '08/139/0167', {
  cphType: 'PERMANENT',
  localAuthority: 'Lanarkshire'
})

export const holding2 = new HTTPObjectResponse('holdings', '12/123/1234', {
  cphType: 'PERMANENT',
  localAuthority: 'Berkshire'
})

export const all = [holding1, holding2]

Lookup a County Parish Holding (CPH) number and identify its type, if it is known in the database.

Use this endpoint to determine if a specific CPH number exists in the database. For convenience, the endpoint will also return the type of holding associated with the CPH number.

```js
import SwaggerClient from 'swagger-client'

const client = await new SwaggerClient(`${url}/openapi.json`)

const response = await client.apis.holdings.list({
  countyId: '45',
  parishId: '001',
  holdingsId: '0002'
})

console.log(response.body) // { "data": { ... }, }
```

Returns holdings

```js
import Swagger from 'swagger-client'

const client = await Swagger(`${url}/openapi.json`)

const holdings = await client.holdings.list({
  countyId: '10',
  parishId: '12',
  holdingsId: '56'
})
```

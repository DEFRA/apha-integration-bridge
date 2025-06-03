Returns holdings

```js
import Swagger from 'swagger-client'

const client = await Swagger(`${url}/openapi.json`)

const holdings = await client.holdings.list({
  countyId: 'your-county-id',
  parishId: 'your-parish-id',
  holdingsId: 'your-holdings-id'
})
```

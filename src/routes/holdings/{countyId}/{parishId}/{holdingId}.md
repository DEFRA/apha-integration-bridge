Use this endpoint to look up a CPH number in Sam. A CPH number is assigned to land and buildings used to keep livestock.

Sam is a legacy Animal and Plant Health Agency (APHA) system. Sam’s core functionality includes managing customer, location, livestock, and work schedule information.

The endpoint also returns basic information about the holding, including the type of CPH number that has been issued (permanent, temporary, or emergency) and the related location ID.

A CPH number is a string of 9 numbers, with a slash in both the 3rd and 7th position (e.g., 12/345/6789). It consists of a County Id (CHAR(2)), a Parish Id (CHAR(3)), and a Holding Id (CHAR(4)).

Counties are divided into parishes. Parishes are divided into holdings. The Holding ID is unique to the keeper.

Below is an example of how to consume this endpoint using the Swagger Client library in JavaScript:

```js
import SwaggerClient from 'swagger-client'

const client = await new SwaggerClient(
  `${url}/.well-known/openapi/v1/openapi.json`
)

const response = await client.apis.holdings.find({
  countyId: '45',
  parishId: '001',
  holdingId: '0002'
})

console.log(response.body) // { "data": { ... }, }
```

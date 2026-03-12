# GET /locations/{locationId}

Use this endpoint when you want one location, including its address and linked commodities/facilities.

## What this endpoint does

- Returns a single location by `locationId`.
- Includes detailed address attributes.
- Includes relationship arrays for `commodities` and `facilities`.

## Authentication and headers

- `Authorization: Bearer <token>` is required.
- `Accept: application/vnd.apha.1+json` is supported.

## Path parameter

| Parameter    | Type   | Required | Rules                                                    |
| ------------ | ------ | -------- | -------------------------------------------------------- |
| `locationId` | string | Yes      | Must match `L` followed by digits (for example `L97339`) |

Example:

```bash
curl -X GET \
  'https://<host>/locations/L97339' \
  -H 'Authorization: Bearer <token>' \
  -H 'Accept: application/vnd.apha.1+json'
```

## Success response (`200 OK`)

Response body:

- `data.type`: always `"locations"`
- `data.id`: requested location ID
- `data.address`: detailed address object
- `data.relationships.commodities.data`: commodity references
- `data.relationships.facilities.data`: facility references
- `links.self`: path of this resource

Example:

```json
{
  "data": {
    "type": "locations",
    "id": "L97339",
    "address": {
      "paonStartNumber": 12,
      "paonDescription": "Willow Barn",
      "street": "Farm Lane",
      "locality": "Westham",
      "town": "Exampletown",
      "administrativeAreaCounty": "Devon",
      "postcode": "EX1 2AB",
      "ukInternalCode": "UKX123",
      "countryCode": "GB"
    },
    "relationships": {
      "commodities": {
        "data": [
          { "type": "commodities", "id": "U000010" },
          { "type": "commodities", "id": "U000020" }
        ]
      },
      "facilities": {
        "data": [{ "type": "facilities", "id": "U000030" }]
      }
    }
  },
  "links": {
    "self": "/locations/L97339"
  }
}
```

## Error responses

| Status | When it happens                                 | Typical code                               |
| ------ | ----------------------------------------------- | ------------------------------------------ |
| `400`  | Invalid parameter/header format                 | `BAD_REQUEST` / `VALIDATION_ERROR`         |
| `404`  | Location not found (or unsupported API version) | `NOT_FOUND` / `UNSUPPORTED_VERSION`        |
| `401`  | Missing or invalid bearer token                 | Unauthorized by auth layer                 |
| `500`  | Unexpected backend failure                      | `INTERNAL_SERVER_ERROR` / `DATABASE_ERROR` |

## Practical tips

- Use this endpoint when you need relationship references for downstream calls.
- If you only need many basic locations by ID, use `POST /locations/find`.

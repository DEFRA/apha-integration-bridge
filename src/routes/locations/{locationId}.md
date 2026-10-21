# GET /locations/{locationId}

Use this endpoint when you want one location, including its address and linked commodities/facilities.

## What this endpoint does

- Returns a single location by `locationId`.
- Includes detailed address attributes.
- Includes the location's `name`, `status`, `position` and `subLocations`, as `POST /locations/find` returns them.
- Includes relationship arrays for `commodities`, `facilities` and `holdings`.

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
- `data.name`: SAM feature name
- `data.status`: the current SAM feature state (`code`, `reasonCode`, `since`)
- `data.address`: detailed address object
- `data.position`: the current primary point in British National Grid eastings and northings (metres), usually to the nearest 100 m, or `null`
- `data.subLocations`: the buildings, fields and sheds of the premises
- `data.relationships.commodities.data`: commodity references
- `data.relationships.facilities.data`: facility references
- `data.relationships.holdings.data`: the CPHs with a current holdership here
- `links.self`: path of this resource

`POST /locations/find` describes `status`, `position` and `subLocations` in full.

### Address fields

- `administrativeAreaCounty` is the decoded county name (from SAM's `ADMINISTRATIVE_AREA` code), as `POST /locations/find` returns it, or `null` if the code has no description.
- `ukInternalCode` is SAM's `UK_INTERNAL_CODE`: one of `England`, `Scotland`, `Wales`, `Northern Ireland`, `Isle of Man`, or `null`.
- `countryCode` is SAM's `COUNTRY_CODE`: one of `England`, `GB` or `Wales`, or `null`.

> **Not the same as `countryCode` elsewhere.** `POST /locations/find`, `POST /customers/find` and `POST /organisations/find` return SAM's `UK_INTERNAL_CODE` as `address.countryCode`. To compare this endpoint with those, use `ukInternalCode` here.

### Masking

Without the `pii` scope, `street`, `locality`, `town`, `administrativeAreaCounty` and `postcode` are masked, matching the structured address on the find endpoints, and so are the location and sub-location names.

Example (trimmed):

```json
{
  "data": {
    "type": "locations",
    "id": "L97339",
    "name": "Willow Barn",
    "status": {
      "code": "COMPLETE",
      "reasonCode": null,
      "since": "2019-04-02T00:00:00Z"
    },
    "position": {
      "easting": 435300,
      "northing": 336300,
      "osMapReference": "SK3530036300",
      "pointType": "ACCESSPOINT"
    },
    "subLocations": [],
    "address": {
      "paonStartNumber": 12,
      "paonDescription": "Willow Barn",
      "street": "Farm Lane",
      "locality": "Westham",
      "town": "Exampletown",
      "administrativeAreaCounty": "Devon",
      "postcode": "EX1 2AB",
      "ukInternalCode": "England",
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
      },
      "holdings": {
        "data": [{ "type": "holdings", "id": "07/094/0117" }]
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

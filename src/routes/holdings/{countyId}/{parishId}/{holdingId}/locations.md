# GET /holdings/{countyId}/{parishId}/{holdingId}/locations

Use this endpoint to get every location a CPH is currently held at, as full location records.

## What this endpoint does

- Lists the CPH's active holderships: a holdership that has not ended, at a location that is not inactive, held through a party role that has not ended by a party that is not inactive. This is the test `GET /holdings/{countyId}/{parishId}/{holdingId}` applies.
- Returns one item per holdership. Each is the location as `POST /locations/find` returns it, plus `status`, `position`, `addresses`, `subLocations` and a `holdership` object.
- A location held under two holderships (two Vetnet core ids) appears twice, with a different `holdership` each time. A holdership SAM stores more than once appears once.
- The list is not paginated.

## Authentication and headers

- `Authorization: Bearer <token>` is required.
- `Accept: application/vnd.apha.1+json` is supported.
- Without the `pii` scope, location and sub-location names, and the street, locality, town, county and postcode of each address, are masked.

## Path parameters

| Parameter   | Type   | Required | Rules            |
| ----------- | ------ | -------- | ---------------- |
| `countyId`  | string | Yes      | Exactly 2 digits |
| `parishId`  | string | Yes      | Exactly 3 digits |
| `holdingId` | string | Yes      | Exactly 4 digits |

Example request:

```bash
curl -X GET \
  'https://<host>/holdings/08/139/0167/locations' \
  -H 'Authorization: Bearer <token>' \
  -H 'Accept: application/vnd.apha.1+json'
```

## Success response (`200 OK`)

Each item adds these fields to the `POST /locations/find` representation:

- `holdership`: `vetnetCoreId`, `from`, `cphType`, and `selected`, which is `true` on one holdership per CPH: the latest `from`, then the highest SAM key. It is the holdership `POST /holdings/find` reports.
- `status`: the current SAM feature state (`code`, `reasonCode`, `since`).
- `position`: the current primary point as SAM stores it, in British National Grid eastings and northings (metres), usually to the nearest 100 m. `null` when SAM has no point. A missing easting or northing, a stored 0 or a value outside the national grid (0 to 700,000 east, 0 to 1,300,000 north) makes both `null`; `osMapReference` is returned as stored.
- `addresses`: every current address with `from` and `isPreferred`. `isPreferred` is `true` on the one chosen postal first, then the latest start date, then the highest SAM key; that address is also in `address`. Most SAM locations have no address: `addresses` is then empty and every member of `address` is `null`. In both, `countryCode` is the UK nation (SAM's `UK_INTERNAL_CODE`), as the find endpoints return it.
- `subLocations`: the buildings, fields and sheds of the premises. `id` is the SAM feature key, as sub-locations have no `L` number. Their `position` is always `null`: this endpoint does not read points for sub-locations.

Example (trimmed):

```json
{
  "data": [
    {
      "type": "locations",
      "id": "L97339",
      "name": "Pinfold Farm",
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
      "subLocations": [
        {
          "type": "sub-locations",
          "id": "8841022",
          "name": "Shed 3",
          "subLocationType": "BROILERSHED",
          "usableArea": 1240,
          "usualStockQuantity": 18000,
          "broilerStockingDensityRange": "33-39",
          "status": {
            "code": "COMPLETE",
            "reasonCode": null,
            "since": "2020-02-10T00:00:00Z"
          },
          "position": null
        }
      ],
      "holdership": {
        "vetnetCoreId": "5500871",
        "from": "2021-03-01",
        "cphType": "PERMANENT",
        "selected": true
      }
    },
    {
      "type": "locations",
      "id": "L120044",
      "name": "High Barn",
      "status": {
        "code": "MIGRATED",
        "reasonCode": "VETNETDATAMIG",
        "since": "2008-01-31T00:00:00Z"
      },
      "addresses": [],
      "holdership": {
        "vetnetCoreId": "4102233",
        "from": "2012-06-15",
        "cphType": "PERMANENT",
        "selected": false
      }
    }
  ],
  "links": {
    "self": "/holdings/08/139/0167/locations"
  }
}
```

## Error responses

| Status | When it happens                  | Typical code                               |
| ------ | -------------------------------- | ------------------------------------------ |
| `400`  | Invalid path parameter format    | `BAD_REQUEST` / `VALIDATION_ERROR`         |
| `401`  | Missing or invalid bearer token  | Unauthorized by auth layer                 |
| `404`  | The CPH has no active holdership | `NOT_FOUND`                                |
| `404`  | `Accept` names a version above 1 | `UNSUPPORTED_VERSION`                      |
| `500`  | Unexpected backend failure       | `INTERNAL_SERVER_ERROR` / `DATABASE_ERROR` |

## How this relates to `GET /holdings/{countyId}/{parishId}/{holdingId}`

- Both return `404` for the same CPHs: those with no active holdership.
- That endpoint returns `409 DUPLICATE_RESOURCES_FOUND` when its CPH-number-only query matches more than one row, which happens when the CPH has several current holderships or when one holdership matches several SAM CPH rows. This endpoint never returns `409`: it matches each holdership on the pair (CPH, Vetnet core id) and lists every one.

## Practical tips

- Be a tolerant reader: ignore fields you do not recognise and do not depend on key order. Fields are only ever added under `application/vnd.apha.1+json`.
- `GET /holdings/{countyId}/{parishId}/{holdingId}/parties` lists everyone involved with the same holderships; a `holder` involvement's `vetnetCoreId` pairs it with an item here.

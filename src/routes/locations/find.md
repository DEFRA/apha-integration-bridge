# POST /locations/find

If you already have location IDs and want full location records in one call, this is the endpoint.

## What this endpoint does

- Batch fetches locations by ID.
- Preserves request order in the response.
- Supports pagination over the submitted ID list.
- Returns only matched locations.

## Authentication and headers

- `Authorization: Bearer <token>` is required.
- `Accept: application/vnd.apha.1+json` is supported.
- `Content-Type: application/json` is required.

## Request

### Query parameters

| Parameter  | Type    | Required | Default | Rules                                               |
| ---------- | ------- | -------- | ------- | --------------------------------------------------- |
| `page`     | integer | No       | `1`     | Minimum `1`                                         |
| `pageSize` | integer | No       | `50`    | Minimum `1`, maximum `{{PAGINATION_MAX_PAGE_SIZE}}` |

### JSON body

| Field | Type             | Required | Rules                                                                          |
| ----- | ---------------- | -------- | ------------------------------------------------------------------------------ |
| `ids` | array of strings | Yes      | At least 1 item; each must match `L` followed by digits (for example `L97339`) |

Example:

```json
{
  "ids": ["L98001", "L98002"]
}
```

## ID handling and pagination behavior

- Duplicate IDs are removed before paging (first occurrence is kept).
- Paging is applied to IDs first, then lookup runs for that page slice.
- Out-of-range page returns `200` with empty `data`.

## Success response (`200 OK`)

Each location includes:

- `type`, `id`, `name`
- `status` (object)
- `address` (BS7666-style address structure)
- `addresses` (array)
- `osMapReference`
- `position` (object)
- `subLocations` (array)
- `livestockUnits` (array)
- `facilities` (array)
- `relationships` (object)

Without the `pii` scope, location and sub-location names, and the street, locality, town, county and postcode of each address, are masked.

### Location fields

- `status`: the current SAM feature state (`code`, `reasonCode`, `since`), with codes as SAM stores them, including retired ones such as `MIGRATED`. SAM does not enforce one current state per location: where it holds several, the latest, then the one with the highest SAM key.
- `position`: the current primary point as SAM stores it, in British National Grid eastings and northings (metres), usually to the nearest 100 m. `null` when SAM has no point. A missing easting or northing, a stored 0 or a value outside the national grid (0 to 700,000 east, 0 to 1,300,000 north) makes both `null`; `osMapReference` is returned as stored.
- `addresses`: every current address with `from` and `isPreferred`. `isPreferred` is `true` on the one chosen postal first, then the latest start date, then the highest SAM key; that address is also in `address`. Most SAM locations have no address: `addresses` is then empty and every member of `address` is `null`.
- `subLocations`: the buildings, fields and sheds of the premises. `id` is the SAM feature key, as sub-locations have no `L` number. Each has its own `status`, chosen as the location's is, or `null` when SAM records none; a sub-location whose current states are all INACTIVE is left out. Each has its own `position`, chosen and checked as the location's is. It has an `address` only when it has one of its own, chosen as the location's is; otherwise the premises address applies. SAM's development database holds no sub-location point or address yet.

### Address fields

- `address.county` is the decoded county name (from SAM's `ADMINISTRATIVE_AREA` code), or `null` if the code has no description.
- `address.countryCode` is SAM's `UK_INTERNAL_CODE`: one of `England`, `Scotland`, `Wales`, `Northern Ireland`, `Isle of Man`, or `null`. It is not SAM's `COUNTRY_CODE`. Note that `GET /locations/{locationId}` returns this value as `ukInternalCode`, and uses `countryCode` for SAM's `COUNTRY_CODE` instead.

Example (trimmed):

```json
{
  "data": [
    {
      "type": "locations",
      "id": "L98001",
      "name": null,
      "status": {
        "code": "COMPLETE",
        "reasonCode": null,
        "since": "2015-01-01T09:30:00Z"
      },
      "address": {
        "primaryAddressableObject": {
          "startNumber": 123,
          "startNumberSuffix": null,
          "endNumber": null,
          "endNumberSuffix": null,
          "description": "Test Building"
        },
        "secondaryAddressableObject": {
          "startNumber": null,
          "startNumberSuffix": null,
          "endNumber": null,
          "endNumberSuffix": null,
          "description": "Unit 1"
        },
        "street": "Test Street",
        "locality": "Test Locality",
        "town": "Test Town",
        "county": "South Lanarkshire",
        "postcode": "TE1 1ST",
        "countryCode": "Scotland"
      },
      "addresses": [
        {
          "street": "Test Street",
          "postcode": "TE1 1ST",
          "isPreferred": true,
          "from": "2015-01-01"
        }
      ],
      "osMapReference": "SK123456",
      "position": {
        "easting": 412345,
        "northing": 323456,
        "osMapReference": "SK123456",
        "pointType": "CENTROID"
      },
      "subLocations": [
        {
          "type": "sub-locations",
          "id": "97001",
          "name": "Shed 1",
          "subLocationType": "BROILERSHED",
          "usableArea": 1200,
          "usualStockQuantity": 30000,
          "broilerStockingDensityRange": "33-39",
          "status": {
            "code": "COMPLETE",
            "reasonCode": null,
            "since": "2015-03-01T00:00:00Z"
          },
          "position": {
            "easting": 412310,
            "northing": 323410,
            "osMapReference": "SK1231023410",
            "pointType": "BUILDING"
          },
          "address": {
            "street": "Test Street",
            "postcode": "TE1 1SH",
            "isPreferred": true,
            "from": "2015-03-01"
          }
        }
      ],
      "livestockUnits": [
        {
          "type": "animal-commodities",
          "id": "LU98001001",
          "animalQuantities": 50,
          "species": null
        }
      ],
      "facilities": [
        {
          "type": "facilities",
          "id": "F98001001",
          "name": null,
          "facilityType": null,
          "businessActivity": null
        }
      ],
      "relationships": {}
    }
  ],
  "links": {
    "self": "/locations/find?page=1&pageSize=50",
    "prev": null,
    "next": null
  }
}
```

## Error responses

| Status | When it happens                                                                | Typical code                               |
| ------ | ------------------------------------------------------------------------------ | ------------------------------------------ |
| `400`  | Invalid body/query (bad location ID format, missing `ids`, invalid `pageSize`) | `BAD_REQUEST` / `VALIDATION_ERROR`         |
| `401`  | Missing or invalid bearer token                                                | Unauthorized by auth layer                 |
| `500`  | Unexpected backend failure                                                     | `INTERNAL_SERVER_ERROR` / `DATABASE_ERROR` |

## Practical tips

- Location IDs must be in `L12345` format.
- Expect `data: []` for unknown IDs; this is normal.
- Use pagination links directly when walking large ID batches.

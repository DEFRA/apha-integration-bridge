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
- `address` (BS7666-style address structure)
- `osMapReference`
- `livestockUnits` (array)
- `facilities` (array)
- `relationships` (object)

Example:

```json
{
  "data": [
    {
      "type": "locations",
      "id": "L98001",
      "name": null,
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
      "osMapReference": "SK123456",
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

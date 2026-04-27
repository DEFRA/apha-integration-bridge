# POST /holdings/find

Use this endpoint to retrieve holding records for known CPH IDs.

## What this endpoint does

- Looks up holdings by CPH.
- Returns matched holdings in request order.
- Supports pagination over requested IDs.
- Returns relation links to location and CPH holder.

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

| Field | Type                 | Required | Rules                                             |
| ----- | -------------------- | -------- | ------------------------------------------------- |
| `ids` | array of CPH strings | Yes      | At least 1 item; each ID must match `NN/NNN/NNNN` |

Example:

```json
{
  "ids": ["11/111/1111", "22/222/2222"]
}
```

## ID handling and pagination behavior

- Duplicate IDs are removed before paging.
- Unknown IDs are ignored.
- Out-of-range page returns `200` with empty `data`.

## Success response (`200 OK`)

Each holding includes:

- `type`: always `holdings`
- `id`: CPH
- `localAuthority`: string or `null`
- `relationships.location.data`: related location reference
- `relationships.cphHolder.data`: related customer reference

Example:

```json
{
  "data": [
    {
      "type": "holdings",
      "id": "11/111/1111",
      "localAuthority": "Local Authority 11/111",
      "relationships": {
        "location": {
          "data": {
            "id": "LOC-1111111111",
            "type": "locations"
          }
        },
        "cphHolder": {
          "data": {
            "id": "CUST-111111111",
            "type": "customers"
          }
        }
      }
    }
  ],
  "links": {
    "self": "/holdings/find?page=1&pageSize=10",
    "prev": null,
    "next": null
  }
}
```

## Error responses

| Status | When it happens                                                           | Typical code                               |
| ------ | ------------------------------------------------------------------------- | ------------------------------------------ |
| `400`  | Invalid payload/query (bad CPH format, missing `ids`, invalid page input) | `BAD_REQUEST` / `VALIDATION_ERROR`         |
| `401`  | Missing or invalid bearer token                                           | Unauthorized by auth layer                 |
| `500`  | Unexpected backend failure                                                | `INTERNAL_SERVER_ERROR` / `DATABASE_ERROR` |

## Practical tips

- For single-holding lookups by county/parish/holding components, use `GET /holdings/{countyId}/{parishId}/{holdingId}`.
- Empty `data` means no matches for the submitted IDs.

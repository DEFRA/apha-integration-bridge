# POST /workorders/find

Need a selected set of work orders by ID? This endpoint is for that exact job.

## What this endpoint does

- Looks up work orders that match the IDs you send.
- Returns only matches (unknown IDs are silently skipped).
- Preserves request order in the response.
- Paginates over your requested IDs using `page` and `pageSize`.

## Authentication and headers

- `Authorization: Bearer <token>` is required.
- `Accept: application/vnd.apha.1+json` is supported (defaults if omitted by the route validation).
- `Content-Type: application/json` is required.

## Request

### Query parameters

| Parameter  | Type    | Required | Default | Rules                     |
| ---------- | ------- | -------- | ------- | ------------------------- |
| `page`     | integer | No       | `1`     | Minimum `1`               |
| `pageSize` | integer | No       | `50`    | Minimum `1`, maximum `50` |

### JSON body

| Field | Type             | Required | Rules                                                                                     |
| ----- | ---------------- | -------- | ----------------------------------------------------------------------------------------- |
| `ids` | array of strings | Yes      | At least 1 item; each item must match `WS-` followed by 5 digits (for example `WS-12345`) |

Example:

```json
{
  "ids": ["WS-76512", "WS-76513", "WS-76514"]
}
```

## ID handling and pagination behavior

- Duplicate IDs are de-duplicated before paging (first occurrence wins).
- Paging is applied to your ID list before lookup.
- If the requested page is out of range, you get `200` with empty `data`.
- `links.prev` can still be present when out of range if `page > 1`.

## Success response (`200 OK`)

Response body shape:

- `data`: array of work orders.
- `links`: pagination links (`self`, `prev`, `next`).

Each work order may include:

- Core fields: `id`, `type`, `activationDate`, `businessArea`, `workArea`, `country`, `aim`, `purpose`, `earliestActivityStartDate`, `species`, `phase`.
- `activities`: ordered activity list.
- `relationships`:
  - `customerOrOrganisation`
  - `holding`
  - `facilities`
  - `location`
  - `livestockUnits`

Example:

```json
{
  "data": [
    {
      "type": "workorders",
      "id": "WS-76512",
      "activationDate": "2024-01-07",
      "businessArea": "Endemic Notifiable Disease",
      "workArea": "Tuberculosis",
      "country": "England",
      "aim": "Contain / Control / Eradicate Endemic Disease",
      "purpose": "Initiate Incident Premises Spread Tracing Action",
      "earliestActivityStartDate": "01/01/2024 09:00:00",
      "species": "Cattle",
      "activities": [],
      "phase": "EXPOSURETRACKING",
      "relationships": {
        "customerOrOrganisation": {
          "data": {
            "id": "C123456",
            "type": "customers"
          }
        },
        "holding": {
          "data": {
            "id": "01/001/0001",
            "type": "holdings"
          }
        },
        "facilities": { "data": [] },
        "location": {
          "data": {
            "id": "LOC-ALPHA",
            "type": "locations"
          }
        },
        "livestockUnits": {
          "data": [
            {
              "id": "U000010",
              "type": "animal-commodities"
            }
          ]
        }
      }
    }
  ],
  "links": {
    "self": "/workorders/find?page=1&pageSize=10",
    "prev": null,
    "next": null
  }
}
```

## Error responses

| Status | When it happens                                                              | Typical code                               |
| ------ | ---------------------------------------------------------------------------- | ------------------------------------------ |
| `400`  | Invalid body/query (for example empty ID, missing `ids`, invalid `pageSize`) | `BAD_REQUEST` / `VALIDATION_ERROR`         |
| `401`  | Missing or invalid bearer token                                              | Unauthorized by auth layer                 |
| `500`  | Unexpected backend failure                                                   | `INTERNAL_SERVER_ERROR` / `DATABASE_ERROR` |

Example `400`:

```json
{
  "message": "Invalid request parameters",
  "code": "BAD_REQUEST",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "\"ids[0]\" is not allowed to be empty"
    }
  ]
}
```

## Practical tips

- Send only IDs you actually need; this endpoint is ID-list driven.
- Use `pageSize=50` for maximum throughput.
- Treat `data: []` as a normal result, not an error.

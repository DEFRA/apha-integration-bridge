# GET /holdings/{countyId}/{parishId}/{holdingId}

Use this endpoint for a single CPH lookup when you already have county/parish/holding parts separately.

## What this endpoint does

- Looks up exactly one holding by its CPH components.
- Returns core holding identity (`id`, `cphType`), its local authority (`localAuthority`, `null` when SAM has none) and key relationships.
- Fails with specific errors when the CPH is missing or ambiguous.

## Authentication and headers

- `Authorization: Bearer <token>` is required.
- `Accept: application/vnd.apha.1+json` is supported.

## Path parameters

| Parameter   | Type   | Required | Rules            |
| ----------- | ------ | -------- | ---------------- |
| `countyId`  | string | Yes      | Exactly 2 digits |
| `parishId`  | string | Yes      | Exactly 3 digits |
| `holdingId` | string | Yes      | Exactly 4 digits |

The full CPH represented by these values is `countyId/parishId/holdingId`.

Example request:

```bash
curl -X GET \
  'https://<host>/holdings/45/001/0002' \
  -H 'Authorization: Bearer <token>' \
  -H 'Accept: application/vnd.apha.1+json'
```

## Success response (`200 OK`)

Example:

```json
{
  "data": {
    "type": "holdings",
    "id": "45/001/0002",
    "cphType": "DEV_SAMPLE",
    "localAuthority": "Local Authority 45/001",
    "relationships": {
      "location": {
        "data": {
          "type": "locations",
          "id": "LOC-BETA"
        }
      },
      "cphHolder": {
        "data": {
          "type": "customers",
          "id": "CUST-450010002"
        }
      }
    }
  },
  "links": {
    "self": "/holdings/45/001/0002"
  }
}
```

## Error responses

| Status | When it happens                                      | Typical code                               |
| ------ | ---------------------------------------------------- | ------------------------------------------ |
| `400`  | Invalid path parameter format                        | `BAD_REQUEST` / `VALIDATION_ERROR`         |
| `401`  | Missing or invalid bearer token                      | Unauthorized by auth layer                 |
| `404`  | Holding not found or inactive                        | `NOT_FOUND`                                |
| `409`  | The CPH lookup matched more than one row (see below) | `DUPLICATE_RESOURCES_FOUND`                |
| `500`  | Unexpected backend failure                           | `INTERNAL_SERVER_ERROR` / `DATABASE_ERROR` |

### What a `409` means

This endpoint looks the holding up by CPH number only, and expects exactly one current row. It returns `409 DUPLICATE_RESOURCES_FOUND` when that query returns more than one row, which happens when either:

- the CPH has several current holderships (more than one current CPH holder / location pairing for the same CPH), or
- one holdership matched several SAM `CPH` rows for the same CPH number.

The response does not say which case applies, and does not list the matching holderships.

## Practical tips

- If your source system already stores full CPH strings, `POST /holdings/find` may be easier.
- Treat `409` as a data-quality issue that needs investigation rather than a transient retry.
- For a CPH that returns `409`, `GET /holdings/{countyId}/{parishId}/{holdingId}/locations`, `/parties` and `/suppliers` list every current holdership, everyone involved with it and the vet practice and delivery partner of each livestock unit.

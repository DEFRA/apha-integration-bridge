# POST /organisations/find

Use this endpoint to fetch organisation records by ID.

## What this endpoint does

- Returns organisation resources that match submitted IDs.
- Filters out non-organisation IDs.
- Preserves request order.
- Supports pagination over the submitted ID list.

## Authentication and headers

- `Authorization: Bearer <token>` is required.
- `Accept: application/vnd.apha.1+json` is supported.
- `Content-Type: application/json` is required.

## Request

### Query parameters

| Parameter  | Type    | Required | Default | Rules                     |
| ---------- | ------- | -------- | ------- | ------------------------- |
| `page`     | integer | No       | `1`     | Minimum `1`               |
| `pageSize` | integer | No       | `50`    | Minimum `1`, maximum `50` |

### JSON body

| Field | Type             | Required | Rules                                         |
| ----- | ---------------- | -------- | --------------------------------------------- |
| `ids` | array of strings | Yes      | At least 1 item; IDs are alphanumeric strings |

Example:

```json
{
  "ids": ["O123456", "O234567"]
}
```

## Filtering behavior

- If IDs include people (`C...`) they are ignored.
- If IDs include unknown values they are ignored.
- Duplicate IDs are de-duplicated before paging.

## Success response (`200 OK`)

Each organisation can include:

- `id`, `type`, `organisationName`
- `address`
- `contactDetails.primaryContact`
- `contactDetails.secondaryContact`
- `relationships.srabpiPlants`

Example:

```json
{
  "data": [
    {
      "type": "organisations",
      "id": "O123456",
      "organisationName": "Acme Farms Ltd",
      "address": {
        "street": "Enterprise Way",
        "town": "Town",
        "postcode": "2BB B22",
        "countryCode": "GB"
      },
      "contactDetails": {
        "primaryContact": {
          "fullName": "Jane Contact",
          "emailAddress": null,
          "phoneNumber": null
        },
        "secondaryContact": {
          "fullName": "John Contact",
          "emailAddress": null,
          "phoneNumber": null
        }
      },
      "relationships": {
        "srabpiPlants": {
          "data": []
        }
      }
    }
  ],
  "links": {
    "self": "/organisations/find?page=1&pageSize=10",
    "prev": null,
    "next": null
  }
}
```

## Error responses

| Status | When it happens                               | Typical code                               |
| ------ | --------------------------------------------- | ------------------------------------------ |
| `400`  | Invalid query/body (for example `pageSize=0`) | `BAD_REQUEST` / `VALIDATION_ERROR`         |
| `401`  | Missing or invalid bearer token               | Unauthorized by auth layer                 |
| `500`  | Unexpected backend failure                    | `INTERNAL_SERVER_ERROR` / `DATABASE_ERROR` |

## Practical tips

- Use this endpoint only for organisation IDs.
- Use `POST /customers/find` for person customer records.
- Empty arrays with `200` are a normal “no matches” response.

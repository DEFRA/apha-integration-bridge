# POST /customers/find

Use this endpoint to fetch person customer records by known customer IDs.

## What this endpoint does

- Returns customer resources for the IDs you send.
- Returns only person-type customers.
- Preserves your request order.
- Supports pagination over requested IDs.

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

| Field | Type             | Required | Rules                                         |
| ----- | ---------------- | -------- | --------------------------------------------- |
| `ids` | array of strings | Yes      | At least 1 item; IDs are alphanumeric strings |

Example:

```json
{
  "ids": ["C123456", "C234567"]
}
```

## Filtering behavior

- If you send mixed IDs, only customer (person) matches are returned.
- Organisation IDs are ignored by this endpoint.
- Unknown IDs are ignored.

## Success response (`200 OK`)

Each returned customer can include:

- Identity fields: `id`, `title`, `firstName`, `middleName`, `lastName`
- `addresses`: with preferred flag and structured address objects
- `contactDetails`: email/mobile/landline entries with preferred flag
- `relationships.srabpiPlants`

Example:

```json
{
  "data": [
    {
      "type": "customers",
      "id": "C123456",
      "title": "Mr",
      "firstName": "Bert",
      "middleName": null,
      "lastName": "Farmer",
      "addresses": [],
      "contactDetails": [],
      "relationships": {
        "srabpiPlants": {
          "data": []
        }
      }
    }
  ],
  "links": {
    "self": "/customers/find?page=1&pageSize=10",
    "prev": null,
    "next": null
  }
}
```

## Error responses

| Status | When it happens                                      | Typical code                               |
| ------ | ---------------------------------------------------- | ------------------------------------------ |
| `400`  | Invalid query/body values (for example `pageSize=0`) | `BAD_REQUEST` / `VALIDATION_ERROR`         |
| `401`  | Missing or invalid bearer token                      | Unauthorized by auth layer                 |
| `500`  | Unexpected backend failure                           | `INTERNAL_SERVER_ERROR` / `DATABASE_ERROR` |

## Practical tips

- If you need organisation records, call `POST /organisations/find` instead.
- If you send duplicate IDs, duplicates are removed before pagination.
- Empty result sets return `200` with `data: []`.

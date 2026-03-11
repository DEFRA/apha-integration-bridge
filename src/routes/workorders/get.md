# GET /workorders

Use this endpoint when you want work orders by activation-date window rather than by explicit IDs.

## What this endpoint does

- Returns work orders where activation date is inside the requested range.
- Supports standard pagination links (`self`, `prev`, `next`).
- Enforces date-window sanity (`endActivationDate` must be after `startActivationDate`).

## Authentication and headers

- `Authorization: Bearer <token>` is required.
- `Accept: application/vnd.apha.1+json` is supported.

## Request

### Query parameters

| Parameter             | Type                     | Required | Default | Rules                                                              |
| --------------------- | ------------------------ | -------- | ------- | ------------------------------------------------------------------ |
| `startActivationDate` | ISO 8601 datetime string | Yes      | -       | Inclusive lower bound                                              |
| `endActivationDate`   | ISO 8601 datetime string | Yes      | -       | Exclusive upper bound and must be later than `startActivationDate` |
| `page`                | integer                  | No       | `1`     | Minimum `1`                                                        |
| `pageSize`            | integer                  | No       | `50`    | Minimum `1`, maximum `50`                                          |

Example request:

```bash
curl -X GET \
  'https://<host>/workorders?startActivationDate=2014-05-01T00:00:00.000Z&endActivationDate=2014-07-01T00:00:00.000Z&page=1&pageSize=10' \
  -H 'Authorization: Bearer <token>' \
  -H 'Accept: application/vnd.apha.1+json'
```

## Success response (`200 OK`)

- `data`: array of work order resources.
- `links.self`: current query URL.
- `links.prev`: previous page URL or `null`.
- `links.next`: next page URL or `null`.

Example:

```json
{
  "data": [
    {
      "type": "workorders",
      "id": "WS-43"
    }
  ],
  "links": {
    "self": "/workorders?startActivationDate=2014-05-01T00%3A00%3A00.000Z&endActivationDate=2014-07-01T00%3A00%3A00.000Z&page=1&pageSize=1",
    "prev": null,
    "next": "/workorders?startActivationDate=2014-05-01T00%3A00%3A00.000Z&endActivationDate=2014-07-01T00%3A00%3A00.000Z&page=2&pageSize=1"
  }
}
```

## Error responses

| Status | When it happens                                                             | Typical code                               |
| ------ | --------------------------------------------------------------------------- | ------------------------------------------ |
| `400`  | Missing/invalid query params, or `endActivationDate <= startActivationDate` | `BAD_REQUEST` / `VALIDATION_ERROR`         |
| `401`  | Missing or invalid bearer token                                             | Unauthorized by auth layer                 |
| `500`  | Unexpected backend failure                                                  | `INTERNAL_SERVER_ERROR` / `DATABASE_ERROR` |

Example date-window error:

```json
{
  "message": "Invalid request parameters",
  "code": "BAD_REQUEST",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "End activation date must be after start activation date"
    }
  ]
}
```

## Practical tips

- Use narrower date windows for faster paging.
- Follow `links.next` rather than manually incrementing `page` where possible.
- An empty `data` array with `200` means there were simply no matches in that window.

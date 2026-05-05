# GET /workorders

Use this endpoint when you want work orders by date window rather than by explicit IDs. You can filter by either activation date or update date, but not both.

## What this endpoint does

- Returns work orders where the chosen date (activation or update) is inside the requested range.
- Filters by `country`, defaulting to `Scotland` when omitted.
- Supports standard pagination links (`self`, `prev`, `next`).
- Enforces date-window sanity (end date must be after start date).
- Requires either activation date range OR update date range, but not both.

## Authentication and headers

- `Authorization: Bearer <token>` is required.
- `Accept: application/vnd.apha.1+json` is supported.

## Request

### Query parameters

You must provide **either** activation date parameters **or** update date parameters, but not both.

#### Activation Date Filtering

| Parameter             | Type                          | Required | Default | Rules                                                                                                   |
| --------------------- | ----------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `startActivationDate` | ISO 8601 date/datetime string | Yes\*    | -       | Inclusive lower date bound; only the `YYYY-MM-DD` portion is used (time-of-day, if present, is ignored) |
| `endActivationDate`   | ISO 8601 date/datetime string | Yes\*    | -       | Exclusive upper date bound; must be later than `startActivationDate`; only `YYYY-MM-DD` is used         |

#### Update Date Filtering

| Parameter          | Type                          | Required | Default | Rules                                                                                                   |
| ------------------ | ----------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `startUpdatedDate` | ISO 8601 date/datetime string | Yes\*    | -       | Inclusive lower date bound; only the `YYYY-MM-DD` portion is used (time-of-day, if present, is ignored) |
| `endUpdatedDate`   | ISO 8601 date/datetime string | Yes\*    | -       | Exclusive upper date bound; must be later than `startUpdatedDate`; only `YYYY-MM-DD` is used            |

#### Common Parameters

| Parameter  | Type    | Required | Default    | Rules                                                                     |
| ---------- | ------- | -------- | ---------- | ------------------------------------------------------------------------- |
| `country`  | string  | No       | `Scotland` | Filters against work order `purposecountry`; matching is case-insensitive |
| `page`     | integer | No       | `1`        | Minimum `1`                                                               |
| `pageSize` | integer | No       | `50`       | Minimum `1`, maximum `{{PAGINATION_MAX_PAGE_SIZE}}`                       |

\* Either both activation date parameters OR both update date parameters are required, but not a mix of both types.

Date handling:

- Filtering is applied at calendar-date boundaries (`[startDate, endDate)`).
- If a datetime is provided, its time component is ignored.
- Activation date filtering uses the `wsactivationdate` field from the database.
- Update date filtering uses the `pxupdatedatetime` field from the database.

Example requests:

**Filtering by activation date:**

```bash
curl -X GET \
  'https://<host>/workorders?startActivationDate=2014-05-01T00:00:00.000Z&endActivationDate=2014-07-01T00:00:00.000Z&country=Scotland&page=1&pageSize=10' \
  -H 'Authorization: Bearer <token>' \
  -H 'Accept: application/vnd.apha.1+json'
```

**Filtering by update date:**

```bash
curl -X GET \
  'https://<host>/workorders?startUpdatedDate=2024-01-01T00:00:00.000Z&endUpdatedDate=2024-02-01T00:00:00.000Z&country=Wales&page=1&pageSize=10' \
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
    "self": "/workorders?startActivationDate=2014-05-01T00%3A00%3A00.000Z&endActivationDate=2014-07-01T00%3A00%3A00.000Z&country=Scotland&page=1&pageSize=1",
    "prev": null,
    "next": "/workorders?startActivationDate=2014-05-01T00%3A00%3A00.000Z&endActivationDate=2014-07-01T00%3A00%3A00.000Z&country=Scotland&page=2&pageSize=1"
  }
}
```

## Error responses

| Status | When it happens                                                                                           | Typical code                               |
| ------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `400`  | Missing/invalid query params, end date not after start date, or mixing activation and update date filters | `BAD_REQUEST` / `VALIDATION_ERROR`         |
| `401`  | Missing or invalid bearer token                                                                           | Unauthorized by auth layer                 |
| `500`  | Unexpected backend failure                                                                                | `INTERNAL_SERVER_ERROR` / `DATABASE_ERROR` |

Example error responses:

**Validation error:**

```json
{
  "message": "Invalid request parameters",
  "code": "BAD_REQUEST",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "\"value\" contains an invalid value"
    }
  ]
}
```

Common validation failures include:

- End date not after start date
- Missing one of the paired date parameters (e.g., `startActivationDate` without `endActivationDate`)
- Mixing activation and update date filters in the same request
- Missing both date filter types entirely
- Invalid date format
- Invalid pagination parameters

## Practical tips

- Use narrower date windows for faster paging.
- Follow `links.next` rather than manually incrementing `page` where possible.
- An empty `data` array with `200` means there were simply no matches in that window.

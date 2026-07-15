# GET /workorders

Use this endpoint when you want work orders by date window rather than by explicit IDs. You can filter by either activation date or update date, but not both.

## What this endpoint does

- Returns work orders where the chosen date (activation or update) is inside the requested range.
- Optionally filters by one or more `country` values; returns all countries when omitted.
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

| Parameter             | Type                          | Required | Default | Rules                                                                           |
| --------------------- | ----------------------------- | -------- | ------- | ------------------------------------------------------------------------------- |
| `startActivationDate` | ISO 8601 date/datetime string | Yes\*    | -       | Inclusive lower timestamp bound (`>=`)                                          |
| `endActivationDate`   | ISO 8601 date/datetime string | Yes\*    | -       | Exclusive upper timestamp bound (`<`); must be later than `startActivationDate` |

#### Update Date Filtering

| Parameter          | Type                          | Required | Default | Rules                                                                        |
| ------------------ | ----------------------------- | -------- | ------- | ---------------------------------------------------------------------------- |
| `startUpdatedDate` | ISO 8601 date/datetime string | Yes\*    | -       | Inclusive lower timestamp bound (`>=`)                                       |
| `endUpdatedDate`   | ISO 8601 date/datetime string | Yes\*    | -       | Exclusive upper timestamp bound (`<`); must be later than `startUpdatedDate` |

#### Common Parameters

| Parameter  | Type            | Required | Default | Rules                                                                                                                                                                                                                                    |
| ---------- | --------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `country`  | string or array | No       | -       | Filters work orders by country. Accepts `England`, `Wales`, or `Scotland` (case-insensitive). Use multiple query parameters for OR logic (e.g., `country=Scotland&country=Wales`). When omitted, returns work orders from all countries. |
| `page`     | integer         | No       | `1`     | Minimum `1`                                                                                                                                                                                                                              |
| `pageSize` | integer         | No       | `50`    | Minimum `1`, maximum `{{PAGINATION_MAX_PAGE_SIZE}}`                                                                                                                                                                                      |

\* Either both activation date parameters OR both update date parameters are required, but not a mix of both types.

Date handling:

- Filtering is applied as a timestamp range (`[startDate, endDate)`), meaning start is inclusive and end is exclusive.
- If a datetime is provided, the full timestamp is used for filtering.
- Timestamps are normalized to UTC when converted for Oracle query execution.
- Activation date filtering uses the `wsactivationdate` field from the database.
- Update date filtering uses the `pxupdatedatetime` field from the database.

Example requests:

**Filtering by activation date (single country):**

```bash
curl -X GET \
  'https://<host>/workorders?startActivationDate=2014-05-01T00:00:00.000Z&endActivationDate=2014-07-01T00:00:00.000Z&country=Scotland&page=1&pageSize=10' \
  -H 'Authorization: Bearer <token>' \
  -H 'Accept: application/vnd.apha.1+json'
```

**Filtering by activation date (multiple countries using OR logic):**

```bash
curl -X GET \
  'https://<host>/workorders?startActivationDate=2014-05-01T00:00:00.000Z&endActivationDate=2014-07-01T00:00:00.000Z&country=Scotland&country=Wales&page=1&pageSize=10' \
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

**No country filter (returns all countries):**

```bash
curl -X GET \
  'https://<host>/workorders?startActivationDate=2024-01-01T00:00:00.000Z&endActivationDate=2024-02-01T00:00:00.000Z&page=1&pageSize=10' \
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

**Date-window error (activation dates):**

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

**Date-window error (update dates):**

```json
{
  "message": "Invalid request parameters",
  "code": "BAD_REQUEST",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "End updated date must be after start updated date"
    }
  ]
}
```

**Mixed date filter error:**

```json
{
  "message": "Invalid request parameters",
  "code": "BAD_REQUEST",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Cannot use both activation date and update date filters in the same request"
    }
  ]
}
```

**Missing date parameters error:**

```json
{
  "message": "Invalid request parameters",
  "code": "BAD_REQUEST",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Either activation date range (startActivationDate and endActivationDate) or update date range (startUpdatedDate and endUpdatedDate) must be provided"
    }
  ]
}
```

**Invalid country value error:**

```json
{
  "message": "Invalid request parameters",
  "code": "BAD_REQUEST",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "\"country\" must be one of [England, Wales, Scotland]"
    }
  ]
}
```

## Practical tips

- Use narrower date windows for faster paging.
- Follow `links.next` rather than manually incrementing `page` where possible.
- An empty `data` array with `200` means there were simply no matches in that window.
- To filter by multiple countries, repeat the `country` query parameter (e.g., `country=Scotland&country=Wales`). This applies OR logic across the specified countries.
- Country filtering is case-insensitive, so `country=scotland`, `country=Scotland`, and `country=SCOTLAND` are equivalent.

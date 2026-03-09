Retrieve workorders filtered by activation date range.

Required query parameters:

- `startActivationDate`: ISO date-time lower bound (inclusive)
- `endActivationDate`: ISO date-time upper bound (exclusive)
- `page`: page number (1-based)
- `pageSize`: items per page (max 50)

Example query string:

```text
startActivationDate=2024-01-01T00:00:00.000Z&endActivationDate=2024-02-01T00:00:00.000Z&page=1&pageSize=10
```

Behaviour:

- Results are paginated using `page` and `pageSize`.
- If no records match, the endpoint returns an empty `data` array.

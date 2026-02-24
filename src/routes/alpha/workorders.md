Retrieve workorders, filtered by activation date range and paginated.

You can test this endpoint using the following query values:

- `startActivationDate`: `2024-01-01T00:00:00.000Z`
- `endActivationDate`: `2030-01-01T00:00:00.000Z`
- `page`: `1`
- `pageSize`: `10`

This query returns the following mock workorder IDs:

- `WS-76512`
- `WS-76513`

Example query string:

```text
startActivationDate=2024-01-01T00:00:00.000Z&endActivationDate=2030-01-01T00:00:00.000Z&page=1&pageSize=10
```

Optional country filter example:

```text
startActivationDate=2024-01-01T00:00:00.000Z&endActivationDate=2030-01-01T00:00:00.000Z&page=1&pageSize=10&country=Scotland
```

Behaviour:

- Results are paginated using `page` and `pageSize`.
- `country` filters the response when provided.
- If no records match, the endpoint returns an empty `data` array.

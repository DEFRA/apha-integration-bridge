Find organisations, given specific ids.

You can test this endpoint by supplying one or all of the following mock IDs:

- `O123456`
- `O234567`

You can send one ID or multiple IDs in the `ids` array.

Example payload (single ID):

```json
{
  "ids": ["O123456"]
}
```

Example payload (all mock IDs):

```json
{
  "ids": ["O123456", "O234567"]
}
```

Behaviour:

- Response order follows the order of IDs in your request.
- Unknown IDs are ignored.
- If no IDs match, the endpoint returns an empty `data` array.

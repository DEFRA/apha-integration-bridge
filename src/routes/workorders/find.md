Find workorders, given specific IDs.

You can send one ID or multiple IDs in the `ids` array.

Example payload:

```json
{
  "ids": ["WS-12345", "WS-67890"]
}
```

Behaviour:

- Response order follows the order of IDs in your request.
- Unknown IDs are ignored.
- If no IDs match, the endpoint returns an empty `data` array.
- Results are paginated by `page` and `pageSize`.

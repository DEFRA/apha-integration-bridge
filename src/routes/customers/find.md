Find customers, given specific IDs.

You can send one ID or multiple IDs in the `ids` array.

Example payload:

```json
{
  "ids": ["C123456", "C234567"]
}
```

Behaviour:

- Response order follows the order of IDs in your request.
- Unknown IDs are ignored.
- If no IDs match, the endpoint returns an empty `data` array.
- Results are paginated by `page` and `pageSize`.

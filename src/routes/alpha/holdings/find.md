Find holdings, given specific ids.

You can test this endpoint by supplying one or all of the following mock IDs:

- `08/139/0167`
- `12/123/1234`

You can send one ID or multiple IDs in the `ids` array.

Example payload (single ID):

```json
{
  "ids": ["08/139/0167"]
}
```

Example payload (all mock IDs):

```json
{
  "ids": ["08/139/0167", "12/123/1234"]
}
```

Behaviour:

- Response order follows the order of IDs in your request.
- Unknown IDs are ignored.
- If no IDs match, the endpoint returns an empty `data` array.

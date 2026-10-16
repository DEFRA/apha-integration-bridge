Retrieve every location a CPH is currently held at, one item per active holdership.

You can test this endpoint with the following mock CPHs:

- `12/345/6789`
- `08/139/0167`
- `33/210/0455`
- `21/087/0042`

Example request:

```text
GET /alpha/holdings/08/139/0167/locations
```

Behaviour:

- Each item is the location as `POST /alpha/locations/find` returns it, plus a `holdership` object.
- A location held under two holderships appears twice, with a different `holdership` each time.
- `broilerStockingDensityRange` is `<TBC>`: its stored form has not yet been read from SAM.
- The list is not paginated.
- Any other CPH returns `404 NOT_FOUND`.

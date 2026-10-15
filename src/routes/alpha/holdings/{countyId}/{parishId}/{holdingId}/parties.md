Retrieve everyone involved with a CPH: the holder of each active holdership, SAM's owner of place for each of their locations, and the keepers of each livestock unit there.

You can test this endpoint with the following mock CPHs:

- `12/345/6789`
- `08/139/0167`
- `33/210/0455`
- `21/087/0042`

Example request:

```text
GET /alpha/holdings/12/345/6789/parties
```

Behaviour:

- Each party appears once, with one `involvements` entry for each way it is involved.
- A `PERSON` party resolves through `POST /alpha/customers/find`, an `ORGANISATION` party through `POST /alpha/organisations/find`.
- The list is not paginated.
- Any other CPH returns `404 NOT_FOUND`.

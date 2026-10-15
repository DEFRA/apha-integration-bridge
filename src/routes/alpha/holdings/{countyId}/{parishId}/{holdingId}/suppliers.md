Retrieve the Official Veterinarian practice (`OVFOR`) and Delivery Partner (`DPFOR`) responsible for each livestock unit at a CPH's locations.

You can test this endpoint with the following mock CPHs:

- `12/345/6789`
- `08/139/0167`
- `33/210/0455`
- `21/087/0042`

Example request:

```text
GET /alpha/holdings/12/345/6789/suppliers
```

Behaviour:

- Each supplier appears once, with one `involvements` entry per livestock unit and involvement type.
- A CPH with no livestock units returns an empty `data` array.
- Any other CPH returns `404 NOT_FOUND`.

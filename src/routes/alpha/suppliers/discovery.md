# GET /alpha/suppliers/discovery

**Alpha, temporary.** A probe for discovering SAM's supplier-side role and
involvement literals when nobody can run SQL against the environment
directly. Remove once the literals are known and hard-coded.

Every dataset is a read-only aggregate: reference values and counts only.
No party names, identifiers or addresses are returned.

## Query parameters

| Parameter | Required | Values                                                                                                             |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `dataset` | Yes      | `roles`, `supplier-role-counts`, `asset-involvement-types`, `asset-involvement-roles`, `supplier-identifier-types` |

## Datasets

| Dataset                     | Answers                                                                  | Cost                                                 |
| --------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| `roles`                     | Every `MAIN_ROLE_TYPE` / `ROLE_TYPE` SAM defines                         | Instant, reference table                             |
| `supplier-role-counts`      | Current parties per SUPPLIER role, split PERSON / ORGANISATION           | Indexed, bounded by supplier roles                   |
| `supplier-identifier-types` | Which `ALT_PARTY_IDENTITY` types supplier parties hold, per role         | Indexed, bounded by supplier roles                   |
| `asset-involvement-types`   | Every current `ASSET_INVOLVEMENT_TYPE` with counts                       | **Aggregates the whole table.** Seconds on real data |
| `asset-involvement-roles`   | Which roles hold which involvement types (e.g. who is the OV for a herd) | **Aggregates the whole table.** Seconds on real data |

Run one dataset per request. The two full-table aggregates are expected to
be slow against production-sized data; if they hit the database call
timeout the response is a `500` and the other datasets are unaffected.

## Example

```
GET /alpha/suppliers/discovery?dataset=roles
```

```json
{
  "data": [
    {
      "main_role_type": "SUPPLIER",
      "role_type": "OVPRACTICE",
      "performs_visits_indicator": null,
      "workgroup_role_indicator": null,
      "role_effective_from_date": "2010-01-01T00:00:00.000Z",
      "role_effective_to_date": null
    }
  ],
  "meta": {
    "dataset": "roles",
    "description": "Every role SAM defines (AHBRP.ROLE reference data, instant)",
    "rowCount": 1,
    "durationMs": 12
  },
  "links": { "self": "/alpha/suppliers/discovery?dataset=roles" }
}
```

Row keys are the SAM column names in lower case, exactly as the driver
returns them.

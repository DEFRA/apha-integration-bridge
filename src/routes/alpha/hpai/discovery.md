# GET /alpha/hpai/discovery

**Alpha, temporary.** A probe that answers the open questions in the HPAI contract and delivery plan (`docs/hpai-api-contract.md`, `docs/hpai-api-change-plan.md`) from real SAM data, because nobody on the team can run SQL against the lower environments directly. Remove it once the questions are answered.

Every dataset returns catalogue metadata, reference codes, or counts and value shapes. None returns a party's name, address, contact details or identifier. The route exists only where `featureFlags.isHpaiDiscoveryEnabled` is on: by default locally and in CDP dev, never in production unless `HPAI_DISCOVERY_ENABLED` is set.

## Usage

```
GET /alpha/hpai/discovery                                   lists every dataset and the question it answers; no database call
GET /alpha/hpai/discovery?dataset=columns,indexes           runs the named datasets, in order
GET /alpha/hpai/discovery?dataset=columns&dataset=indexes   the same
```

Each result carries the dataset's description, the question it answers, its rows, the row count, how long it took, and `error`. A dataset that fails reports its Oracle or driver code and the first line of the message (for example `ORA-00942`, `ORA-00904` for a missing column, or `NJS-123` for a timeout); the other datasets still run. The response is `200` even when some datasets fail.

## Timing and concurrency

Each dataset may run for up to 20 seconds, and one request spends at most 40 seconds in total, counted from when the request arrives. Datasets reached after that come back with `error.code` `SKIPPED`. The `catalogue` and `reference` datasets are instant and can be requested together. Most `scan` datasets aggregate a whole SAM table and take seconds, so request them one or two at a time.

Only one discovery request runs at a time across all instances, so the probe never holds more than one SAM pool connection. A request that arrives while another is running gets `429` with code `TOO_MANY_REQUESTS`. Wait for the first to finish and retry.

## Datasets

| Dataset                      | Kind      | Answers                                                                                         |
| ---------------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| `columns`                    | catalogue | Which columns the contract relies on exist in this database                                     |
| `indexes`                    | catalogue | Whether the satellite tables are indexed on the columns the new queries join on                 |
| `ref-data-codes`             | reference | The `<TBC>` code lists in contract appendix B, and which set decodes role names                 |
| `cph-holderships`            | scan      | How many CPHs have several active holderships, share a location, or would `409` today, and why  |
| `feature-types`              | scan      | The `featureType` code list                                                                     |
| `feature-states`             | scan      | Status and reason codes; features with several current states                                   |
| `feature-relationships`      | scan      | How a premises reaches its sub-locations, and in which direction                                |
| `sub-locations`              | scan      | Sub-location types and how well their attributes are filled                                     |
| `sub-locations-per-location` | scan      | How large `subLocations[]` gets                                                                 |
| `feature-points`             | scan      | Point coverage, several points per feature, map reference without easting/northing, point types |
| `points-per-feature`         | scan      | Whether `position` can be one object or needs a rule to choose a point                          |
| `os-map-reference-formats`   | scan      | The map-reference formats the latitude/longitude parser must accept                             |
| `feature-geometry`           | scan      | Whether SAM holds geometry, and for which features                                              |
| `geometry-headers`           | scan      | The stored geometry format, from the first bytes of up to 1,000 geometries                      |
| `feature-addresses`          | scan      | Locations with zero, one or several current addresses                                           |
| `feature-involvements`       | scan      | The owner-of-place literal and statuses; the temporary-CPH indicator                            |
| `asset-involvements`         | scan      | Keeper involvement types and statuses                                                           |
| `involvement-roles`          | scan      | Which roles hold land-owner and keeper involvements                                             |
| `role-types`                 | scan      | Every role with its population by party type                                                    |
| `party-role-states`          | scan      | Role status codes by role type; roles with no or several current states                         |
| `party-relationships`        | scan      | Which relationship links a person to an organisation, with the party type at each end           |
| `organisation-attributes`    | scan      | Organisation types, Defra unit types and head-office flags                                      |
| `contact-methods`            | scan      | Contact media, telecom types, usage types and preferred flags                                   |
| `contact-multiplicity`       | scan      | How many phone numbers or email addresses of one type a party has                               |
| `party-id-formats`           | scan      | The shapes of customer ids by party type                                                        |

## Example

```
GET /alpha/hpai/discovery?dataset=feature-types
```

```json
{
  "data": [
    {
      "dataset": "feature-types",
      "kind": "scan",
      "description": "FEATURE_TYPE values for locations, sub-locations and other features",
      "answers": "The featureType code list (appendix B, question 5)",
      "rowCount": 1,
      "durationMs": 1840,
      "rows": [
        {
          "feature_type": "PREMISES",
          "subtype": "LOCATION",
          "features": 412093
        }
      ],
      "error": null
    }
  ],
  "meta": {
    "datasets": 1,
    "durationMs": 1852,
    "perDatasetTimeoutMs": 20000,
    "budgetMs": 40000
  },
  "links": { "self": "/alpha/hpai/discovery?dataset=feature-types" }
}
```

Row keys are the SQL column aliases in lower case, exactly as the driver returns them. The values in this example are illustrative.

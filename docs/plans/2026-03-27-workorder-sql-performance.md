# Workorder SQL Performance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce database work for workorder retrieval by removing redundant scans of `PEGA_DATA.INDEX_AC_WSENTITIES` while preserving current API output shape (including multi-activity, multi-facility, and multi-livestock relationships).

**Architecture:** Keep one SQL query per endpoint, but introduce shared CTEs for targeted workorders and a single filtered/materialized `ws_entities` source. Derive `ws_loc`, `ws_c`, `ws_lu`, and `ws_f` from that one source so row shape remains compatible with current mappers. Evaluate `DISTINCT` removal only after proving duplicates are not semantically required.

**Tech Stack:** Oracle SQL (`src/lib/db/queries/*.sql`), Node query loader, Jest snapshots and mapper tests.

## Why this is the best first change

- `.schema/SCHEMA_OVERVIEW.md` and `.schema/derived/sam-schema-reference.md` confirm the PEGA tables (`AHWORK_AC`, `INDEX_AC_WORKSCHEDULE`, `INDEX_AC_ACTIVITY`, `INDEX_AC_WSENTITIES`) are not covered by parsed PDM metadata, so cardinality assumptions are uncertain.
- `toWorkorders` supports many activities/facilities/livestock units and de-duplicates in JS; a hard pivot to one row per workorder risks data loss.
- A single filtered/materialized `ws_entities` CTE is high-impact and low-risk: it cuts repeated scans without changing mapper-facing columns.

### Task 1: Baseline duplicate and cardinality checks

**Files:**

- Modify: `src/lib/db/queries/get-workorders.sql`
- Modify: `src/lib/db/queries/find-workorders.sql`

**Step 1: Create temporary duplicate-check SQL variants (local branch only)**

Add temporary diagnostic wrappers to each query shape:

```sql
-- Diagnostic pattern (run manually in lower env)
SELECT COUNT(*) total_rows
FROM (
  -- existing SELECT body WITHOUT DISTINCT
);
```

```sql
-- Duplicate group count for final row shape
SELECT COUNT(*) duplicate_groups
FROM (
  SELECT
    ws.pyid,
    ws_loc.entityid,
    ws_loc.cphid,
    ws_c.entityid,
    ws_lu.entityid,
    ws_f.entityid,
    wsa.wsa_id,
    wsa.activitysequencenumber,
    COUNT(*) cnt
  FROM ...
  GROUP BY
    ws.pyid,
    ws_loc.entityid,
    ws_loc.cphid,
    ws_c.entityid,
    ws_lu.entityid,
    ws_f.entityid,
    wsa.wsa_id,
    wsa.activitysequencenumber
  HAVING COUNT(*) > 1
);
```

**Step 2: Run diagnostics in lower environment**

Run: execute diagnostics for representative date windows and ID lists.
Expected: concrete evidence whether each `DISTINCT` is needed.

**Step 3: Record outcomes in PR description**

Document whether:

- `filtered_workorders` `DISTINCT` is required for stable pagination.
- Final `SELECT DISTINCT` is required to suppress true duplicates.

### Task 2: Refactor `get-workorders.sql` to single `ws_entities` scan

**Files:**

- Modify: `src/lib/db/queries/get-workorders.sql`
- Test: `src/lib/db/queries/__snapshots__/get-workorders.test.js.snap`

**Step 1: Add targeted workorder CTE reuse (already `requested_workorders`)**

Use `requested_workorders` as the key filter input for entity/activity CTEs.

**Step 2: Add one filtered/materialized entities CTE**

```sql
, ws_entities AS (
  SELECT /*+ MATERIALIZE */
    wsl.pyid,
    wsl.pxindexpurpose,
    wsl.entityid,
    wsl.cphid
  FROM pega_data.index_ac_wsentities wsl
  JOIN requested_workorders rw
    ON rw.work_order_id = wsl.pyid
  WHERE wsl.pxindexpurpose IN (
    'workScheduleLocation',
    'workScheduleCustomers',
    'workScheduleLivestockUnits',
    'workScheduleFacilities'
  )
)
, ws_loc AS (
  SELECT pyid, entityid, cphid
  FROM ws_entities
  WHERE pxindexpurpose = 'workScheduleLocation'
)
, ws_c AS (
  SELECT pyid, entityid
  FROM ws_entities
  WHERE pxindexpurpose = 'workScheduleCustomers'
)
, ws_lu AS (
  SELECT pyid, entityid
  FROM ws_entities
  WHERE pxindexpurpose = 'workScheduleLivestockUnits'
)
, ws_f AS (
  SELECT pyid, entityid
  FROM ws_entities
  WHERE pxindexpurpose = 'workScheduleFacilities'
)
```

**Step 3: Replace inline `index_ac_wsentities` subqueries with CTE references**

Keep current join predicates/aliases so selected columns remain unchanged.

**Step 4: (Optional but recommended) similarly constrain `wsa` CTE to `requested_workorders`**

```sql
JOIN requested_workorders rw
  ON rw.work_order_id = SUBSTR(wsa.pxcoverinskey, 7)
```

Expected: avoid scanning all activities for all workorders when page size is small.

### Task 3: Apply same pattern to `find-workorders.sql`

**Files:**

- Modify: `src/lib/db/queries/find-workorders.sql`
- Test: `src/lib/db/queries/__snapshots__/find-workorders.test.js.snap`

**Step 1: Add `requested_workorders` CTE from `IN (:workorder_ids)` set**

```sql
WITH requested_workorders AS (
  SELECT ws.pyid work_order_id
  FROM pega_data.index_ac_workschedule ws
  WHERE ws.pyid IN (:workorder_ids)
)
```

**Step 2: Reuse Task 2 `ws_entities`/`ws_loc`/`ws_c`/`ws_lu`/`ws_f` pattern filtered by `requested_workorders`**

**Step 3: Constrain `wsa` CTE using `requested_workorders`**

Expected: fewer scanned rows for both entities and activities.

### Task 4: `DISTINCT` decision and final SQL cleanup

**Files:**

- Modify: `src/lib/db/queries/get-workorders.sql`
- Modify: `src/lib/db/queries/find-workorders.sql`

**Step 1: Keep `filtered_workorders` `DISTINCT` unless diagnostics prove 1:1 row uniqueness**

Rationale: protects pagination correctness.

**Step 2: Remove top-level `SELECT DISTINCT` only if duplicate check shows it is redundant**

If duplicates remain in real data, keep it.

**Step 3: Keep old Oracle outer join semantics equivalent (or migrate to ANSI joins in separate change)**

Avoid mixing performance refactor with broad syntax modernization.

### Task 5: Verify behavior and snapshots

**Files:**

- Modify: `src/lib/db/queries/__snapshots__/get-workorders.test.js.snap`
- Modify: `src/lib/db/queries/__snapshots__/find-workorders.test.js.snap`

**Step 1: Run focused query tests**

Run:

```bash
npm test -- src/lib/db/queries/get-workorders.test.js src/lib/db/queries/find-workorders.test.js
```

Expected: PASS and snapshots reflect CTE rewrite.

**Step 2: Run mapper regression tests**

Run:

```bash
npm test -- src/lib/db/mappers/to-workorders.test.js src/lib/db/mappers/to-workorder.test.js
```

Expected: PASS; multi-relationship aggregation unchanged.

**Step 3: (If environment available) run integration tests hitting Oracle**

Run:

```bash
npm test -- src/lib/db/queries/get-workorders.test.js -t "returns page-limited workorders"
```

Expected: same IDs/order/hasMore behavior.

### Task 6: Commit

**Step 1: Commit SQL refactor and snapshots**

```bash
git add src/lib/db/queries/get-workorders.sql src/lib/db/queries/find-workorders.sql src/lib/db/queries/__snapshots__/get-workorders.test.js.snap src/lib/db/queries/__snapshots__/find-workorders.test.js.snap docs/plans/2026-03-27-workorder-sql-performance.md
git commit -m "perf(workorders): reduce wsentities/activity scans via targeted CTEs"
```

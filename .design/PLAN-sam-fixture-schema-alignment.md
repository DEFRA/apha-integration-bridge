# Consensus Plan — SAM Fixture Schema Alignment

Slug: `sam-fixture-schema-alignment`
Branch: `feat/sam-fixture-schema-alignment`

## Goal

Rewrite the local OracleDB fixtures in `.docker-compose/oracledb/` so the AHBRP
tables structurally match the canonical SAM schema (`.schema/derived/sam-relational-schema.sql`,
derived from `SAM-APP-101 PDM BRP01 V11.7 20180322`): every real column present,
correct data types, primary keys, foreign keys, check constraints and indexes. The
same mock records must be preserved (backfilled where new constraints demand, and
**completed** where the current fixtures are referentially incomplete) so the
container still initialises cleanly and the existing Jest suite stays green.

**Binding constraint, precisely stated.** The user's hard requirement is "current
integration tests continue to pass." The Jest suite mocks the DB (route tests spy on
`src/lib/db/operations/execute.js`; query tests snapshot the SQL string; the
locations/customers/workorders route tests never open a real connection), so it does
**not** depend on fixture DB _content_ — it stays green for any valid fixture. The
secondary goal is that AHBRP query _results_ against the booted DB are preserved.
These two goals conflict for one cluster only (see D14): the current fixtures are
referentially **incomplete** — most `FEATURE`/`ASSET` parent rows are missing, so the
location queries' INNER JOIN to `FEATURE` makes several seeded locations (notably
L97339) return _nothing_ today. Making relationships "correct" (the user's explicit
ask) requires adding those parents, which makes those locations return their intended
data. We resolve this in favour of fidelity + completion (D14), preserve results
byte-identical for every query that does **not** depend on the completed parents
(find-holding(s), find-customers, get-customer-types, ref-mappings, get-units), and
document the location-query delta explicitly.

## Context / how the fixtures are used

- `.docker-compose/oracledb/00*.sql` are mounted into the Oracle Free 23.8
  container at `/opt/oracle/scripts/startup` (see `.docker-compose/oracledb.compose.yml`)
  and run in filename order on first boot.
- The Jest suite (`npm test`) does **not** hit Oracle: route tests mock
  `src/lib/db/operations/execute.js`; query tests snapshot the SQL string. So
  `npm test` will stay green even if a fixture is broken — it is _not_ a guard for
  this change. "Integration tests pass locally" means: the container init scripts
  all run without error, and the AHBRP queries in `src/lib/db/queries/*.sql` return
  the same rows they do today when run against the booted fixture DB.
- Authoritative schema: all 34 AHBRP tables referenced by service queries are
  present in `.schema/derived/sam-relational-schema.sql`. The 4 `PEGA_DATA.*`
  work-order tables are **not** in any PDM export.

## In-scope tables (34, AHBRP)

CPH, PARTY, PARTY_ROLE, PARTY_STATE, PARTY_VERSION, PERSON, ORGANISATION,
ADDRESS, ADDRESS_USAGE, ALT_PARTY_IDENTITY, BS7666_ADDRESS, TELECOM_ADDRESS,
PARTY_CONTACT_ADDRESS, FEATURE, FEATURE_INVOLVEMENT, FEATURE_STATE,
FEATURE_ADDRESS, FEATURE_POINT, LOCATION, ASSET, ASSET_LOCATION, ASSET_STATE,
LIVESTOCK_UNIT, FACILITY, FACILITY_TYPE, FACILITY_BUSINESS_ACTIVTY, ANIMAL,
ANIMAL_SPECIES, COLL_REGSTRD_ANIMAL_GROUP, REF_DATA_SET, REF_DATA_SET_MAP,
REF_DATA_CODE, REF_DATA_CODE_DESC, REF_DATA_CODE_MAP.

## Assumptions

- The canonical relational SQL is the source of truth for column names, types,
  PKs, CHECKs and indexes — but it is a _generated_ artefact and is **not directly
  executable**: (a) several FK clauses name the child column as the parent column
  (e.g. `FK_RDSM_REF_DATA_SET_TO ... REFERENCES REF_DATA_SET (TO_REF_DATA_SET_PK)`
  — parent column should be `REF_DATA_SET_PK`; same pattern in
  `FK_RDCM_REF_DATA_CODE_FM/TO`); (b) it references ~7 tables outside our scope;
  (c) it emits `CREATE INDEX functional IX_...` which is not valid Oracle. We
  correct (a), omit (b) FKs with an inline note, and reproduce (c) as ordinary
  indexes on the same columns.
- "Tests continue to pass" is the binding constraint and outranks literal schema
  fidelity wherever the two conflict (recorded as decisions below).
- The Oracle Free 23.8 image is available locally and the container can be booted
  for empirical verification (confirmed: image present, daemon up).
- Existing seed data's _business meaning_ is preserved exactly; new columns are
  backfilled with values not consumed by any query, or equal to the value the
  query already expects.

## Non-goals

- Not creating SAM tables outside the 34 in-scope set (no ROLE, DOCUMENT, BREED,
  TEMP_CPH, REF_DATA_SUBSET, ACTIVITY_CLASS_PARTY_ROLE, FACILITY_SUB_BSNSS_ACTVTY).
- Not restructuring the `PEGA_DATA.*` work-order tables (006/007/008). Only 006's
  _AHBRP_ ref-data seed block is migrated to the new ref-data shape.
- Not changing any application code, query SQL, route, or Jest test.
- Not reproducing sequences, triggers, partitioning, tablespaces, storage clauses,
  or `NUMBER(38,0)` vs `NUMBER` precision where the existing fixtures use bare
  `NUMBER` for PK/FK surrogates (kept as `NUMBER`; behaviourally identical for the
  integer keys used).

## Decisions made (reviewers: challenge these)

- **D1 — Scope = 34 query-referenced AHBRP tables.** Others not reproduced.
- **D2 — FK strategy.** Reproduce FKs only where both endpoints are in-scope, with
  corrected parent-column references, replacing out-of-scope-parent FKs with an
  inline `-- real FK: ... (parent out of fixture scope)` note. Additionally, the
  soft, nullable, query-unused `REF_DATA_SET(PARTY_PK)` /
  `REF_DATA_SET_MAP(PARTY_PK) → ORGANISATION` FKs are **omitted** (documented),
  to keep the ref-data cluster free of a cross-cluster drop/create dependency.
- **D3 — PEGA untouched.** 006/007/008 PEGA DDL+data unchanged. Only 006's AHBRP
  `REF_DATA_*` seed block is updated to the new ref-data schema.
- **D4 — CPH stays emulated as a view.** Keep `v_cph_customer_unit` (base table) +
  `cph` view exposing `(CPH, CPH_TYPE)`. We do **not** switch to the literal
  `CPH CHAR(11)` table: (a) the service consumes only `CPH`/`CPH_TYPE`; (b)
  `CHAR(11)` blank-pads the fixture's shorter identifiers (e.g. `01/02/03`),
  breaking `CPH = :cph` equality and `SUBSTR(CPH,1,6)`; (c) the real
  `FEATURE_INVOLVEMENT → CPH (CPH, VETNET_CORE_ID)` FK and `ck_finv_type_cph_core_id`
  CHECK depend on a CORE_ID/VETNET graph the fixtures do not model. Consequently
  FEATURE_INVOLVEMENT's `FK_FINV_CPH` and `ck_finv_type_cph_core_id` CHECK are
  omitted, and **FEATURE_INVOLVEMENT.CPH is kept as a VARCHAR2 wide enough for the
  seeded CPH values** rather than `CHAR(11)` (second deliberate divergence, paired
  with D4). Both are the only intentional structural divergences; documented inline.
- **D5 — Column widths/types (audit, not blanket-shrink).** Match real types and
  widths, EXCEPT where an existing seed value exceeds the real width AND the column
  is SELECTed/filtered (cannot shorten without changing results) — there, keep a
  width wide enough for the data with an inline note. Each stage performs a
  per-column width/type audit (seed value length vs real width) for its cluster.
  Known widen-needed columns: `PARTY.PARTY_ID` (real 8; seeds `CUST-…` up to 14),
  `LOCATION.LOCATION_ID` (real 8; seeds `LOC-1111111111` 14), `LIVESTOCK_UNIT.UNIT_ID`
  (real 8; `LU98001001` 10), `FACILITY.UNIT_ID` (real 8; `F98001001` 9),
  `REF_DATA_CODE.CODE` (real 20; `Disease Investigation` 21 and
  `CATTLE_BREEDING_DAIRY` 21) AND the matching `FACILITY_BUSINESS_ACTIVTY.FACILITY_BUSINSS_ACTVTY_CODE`
  (real 20; `CATTLE_BREEDING_DAIRY` 21) — both sides of the `find-locations`/
  `get-location` equijoin must be widened together. Type-change (NULL seeds, safe):
  `BS7666_ADDRESS.PAON_*_SUFFIX`/`SAON_*_SUFFIX` `NUMBER → CHAR(1)`. Shrink-safe
  (all seeds fit): `ORGANISATION.PRIMARY_CONTACT_FULL_NAME` (255 → real 70). "Tests
  pass" outranks exact width.
- **D6 — State tables get real surrogate PKs + neutral idempotency.**
  FEATURE_STATE/PARTY_STATE/ASSET_STATE adopt their real `*_STATE_PK` surrogate PKs
  - `*_STATE_FROM_DTTM` (NOT NULL, TIMESTAMP(3)) + real unique indexes. **All
    state-row producers — both `MERGE ... ON (feature_pk/party_pk)` upserts AND plain
    `INSERT`s** (the plain inserts in 001 for feature_state/asset_state, and 002/004
    for party_state, are ~8 additional sites beyond the MERGEs) — are rewritten to
    produce exactly one open (`*_TO_DTTM IS NULL`, non-INACTIVE) row per entity, using
    a **deterministic surrogate PK derived 1:1 from the entity PK** (so the surrogate
    is stable and re-execution hits `EXCEPTION WHEN DUP_VAL_ON_INDEX`), so
    re-execution/over-seeding cannot create a second open row and every query's state
    filter still matches the same single row. Post-insert `UPDATE`s (e.g. 002 setting
    feature_state ACTIVE) are kept as UPDATEs. The DATE→TIMESTAMP(3) change on
    `*_STATE_FROM_DTTM`/`*_STATE_TO_DTTM` is query-neutral (queries filter `*_TO_DTTM
IS NULL` only) but is verified in-container.
- **D7 — Backfill neutrality (verified per column).** New NOT NULL / CHECK columns
  are backfilled with values not SELECTed/filtered by any query (verified against
  `src/lib/db/queries/*.sql`); where a query reads the column, the value equals what
  it already expects. CHECK-constrained `*_IND CHAR(1)` columns are backfilled with
  `'Y'`/`'N'` only; `REF_DATA_SET_MAP_TYPE` with a value ∈ {PC,NW,CE,RR}.
- **D8 — find-holding(s) cardinality preservation.** Today, location-only
  feature_involvements with `PARTY_ROLE_PK IS NULL` (e.g. feature 5001 / CPH
  `01/001/0001`, and the inactive control 5999 / `99/999/9999`) are excluded from
  `find-holding(s).sql` by its INNER JOIN to PARTY_ROLE, yet still surface their CPH
  in `find-locations`. Real schema makes `FEATURE_INVOLVEMENT.PARTY_ROLE_PK` NOT
  NULL, so these rows must gain a party chain. To keep holdings result sets
  identical, the backfilled party chain for these previously-orphan holderships uses
  a **past-dated `PARTY_ROLE_TO_DATE`** (so `find-holding`'s `PR.PARTY_ROLE_TO_DATE
IS NULL` filter still excludes them) while `find-locations` (which never joins
  PARTY_ROLE) still shows the CPH. **The correction is an `UPDATE` of the existing
  FI row** (`SET PARTY_ROLE_PK = <new past-dated party_role_pk>`), never an INSERT of
  a second FI row — so the `FEATURE_INVOLVEMENT_PK = feature_pk` 1:1 mapping holds.
  Previously-orphan FI rows = feature 5001 (`01/001/0001`) and the inactive control
  5999 (`99/999/9999`); both already have a single CPHHOLDERSHIP FI row in 001 with
  `PARTY_ROLE_PK` NULL. All other listed "included" holderships (45/001/0002,
  01/409/1111×2, 04/432/1234, 11/111/1111, 22/222/2222, 33/333/3333, 98/001/0001,
  98/002/0001) already carry a non-null `PARTY_ROLE_PK` from 002/003/005, so they
  need no PARTY_ROLE_PK backfill — confirm this in Stage 4.
- **D9 — All-DROPs-first DDL structure.** `001` is restructured into ordered
  sections: (A) `DROP TABLE … CASCADE CONSTRAINTS PURGE` for all 34 tables in
  reverse-dependency order (idempotent over a persisted volume, and FK-safe because
  every table is dropped before any is recreated); (B) all `CREATE TABLE` + index
  DDL in forward-dependency order (parents before children — e.g. PARTY → PARTY*ROLE
  → FEATURE_INVOLVEMENT; ADDRESS → BS7666_ADDRESS/FEATURE_ADDRESS; ANIMAL_SPECIES →
  ANIMAL → ASSET; ORGANISATION before ref-data only if a kept FK requires it, else
  any order); (C) seed inserts in dependency order; (D) the `cph` view. Tables
  currently created in 002/004 (ADDRESS, party-cluster, etc.) are **relocated** into
  001's CREATE section; the now-redundant `CREATE TABLE`/`ALTER TABLE` blocks in
  002/004 are removed (or left as no-op-safe and documented). This eliminates all
  cross-file DDL-ordering hazards.
  **D9 refinement (adopted during implementation):** foreign keys are added as
  **trailing `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY`** statements in a final
  section that runs \_after* all tables and all seed data exist (a dedicated
  `009_add_foreign_keys.sql`), rather than inline in each `CREATE TABLE`. This is
  strictly safer: parent tables/PKs and all rows are already present, so each FK is
  validated against fully-loaded data at add time (any orphan surfaces as `ORA-02298`
  and fails the boot — making the boot the FK gate), and it removes all
  create-order/drop-order coupling so the in-place column canonicalisation per stage
  needs no physical relocation of `CREATE TABLE` blocks. Section A still drops every
  table `CASCADE CONSTRAINTS PURGE` (so re-boot over a persisted volume drops the FKs
  too); column-shape changes that require it still DROP+CREATE the table. The
  non-canonical helper table
  `V_CPH_CUSTOMER_UNIT` (local stand-in for the SAM `CPH` source, read directly by
  `get-units` and exposed via the `cph` view) is **retained as-is** and keeps its
  existing DROP (section A) / CREATE (section B, before the `cph` view) / seed
  placement; it is out of the 34-table canonicalisation scope (D1) but must remain
  present and unchanged so `get-units` and `cph` keep working.
- **D10 — Parent-row backfill for new FKs.** Adding FEATURE/ASSET/ANIMAL FKs requires
  a parent row for every referenced key. Enumerate and seed:
  - a `FEATURE` row (with `FEATURE_TYPE='LOCATION'`) for every `feature_pk` used by
    LOCATION / FEATURE_STATE / FEATURE_INVOLVEMENT / FEATURE_ADDRESS / FEATURE_POINT /
    ASSET_LOCATION: `5001,5002,5999,6409,6410,7003,7004,7432,81111,82222,83333,
91001,91002` (91001/91002 already have FEATURE rows from 005 — confirm, don't
    duplicate).
  - an `ASSET` row for every `asset_pk` used by ASSET_LOCATION / ASSET_STATE /
    LIVESTOCK_UNIT / FACILITY: `8001,8002,8003,8004,8005` (from 001) plus
    `93001,93002,93003` (already seeded in 005). **For the 001 assets (8001,8002
    livestock + 8003,8004 facility + 8005 livestock), set `ANIMAL_PK = NULL`** so the
    `LU_SPECIES` inner-join chain yields no species and L97339's livestock surface
    with `species='N/A'` (any non-null ANIMAL_PK would resolve a real species, and a
    non-null ANIMAL_PK without ANIMAL_SPECIES/REF_DATA_CODE parents would drop the LU
    row). `ASSET_TYPE` = `'LIVESTOCKUNIT'`/`'FACILITY'` per role. NULLs are fine under
    the real `UK_ASSE_ANIMAL_PK` unique index (Oracle allows multiple NULLs).
  - `ANIMAL` (+ `ANIMAL_SPECIES`) rows only for the `animal_pk`s actually referenced:
    `93001001` (species 2001 CATTLE) and `93003001` (species 2002 SHEEP) — both
    already seeded in 005; no other ANIMAL is referenced (001's livestock have
    `ANIMAL_PK=NULL`). Any backfilled non-null `ANIMAL_PK` must not collide with
    93001001/93003001 (real `UK_ASSE_ANIMAL_PK` unique index on ASSET(ANIMAL_PK)).
    All query-neutral; confirmed against find-locations/get-location.
- **D11 — Verification harness committed.** Because `npm test` does not exercise
  Oracle, commit a `scripts/verify-sam-fixtures.sh` that boots a throwaway Oracle
  container against the scripts, fails on any `ORA-` during init, and runs each
  in-scope AHBRP query (find-holding, find-holdings, find-locations, get-location,
  find-customers, get-customer-types, get-purpose-species-code-mapping,
  get-workarea-code-mapping, **and `get-units`** — which reads `v_cph_customer_unit`
  directly; `get-units` has no static `.sql` file (it is a knex query built in
  `src/lib/db/queries/get-units.js`), so the harness renders/extracts its SQL rather
  than running a file), plus a committed expected-output baseline
  (`.design/sam-fixture-baseline/`). This is the regression guard and the per-stage
  acceptance gate. (A CI job to run it is recommended but out of scope here.) The
  clean-boot gate is also the **deterministic backstop** for the plan's "confirm
  during implementation" steps (e.g. exhaustively finding every previously-orphan
  `FEATURE_INVOLVEMENT.PARTY_ROLE_PK IS NULL` row, every BS7666 row lacking an
  ADDRESS parent, every missing FEATURE/ASSET parent, every plain state-INSERT site):
  any miss surfaces as a boot-time `ORA-01400` (NOT NULL) / `ORA-02291` (FK) /
  `ORA-00001` (unique) and fails the stage, so no such omission can ship silently.
- **D12 — Idempotent-DDL & schema wiring preserved.** Keep the
  `BEGIN EXECUTE IMMEDIATE '…'; EXCEPTION WHEN OTHERS THEN NULL; END;` idempotency
  idiom and the `CONNECT ahbrp/…` / `CONNECT pega_data/…` schema switches.
- **D13 — FACILITY_NAME kept NULLABLE (3rd documented divergence).** Canonical
  `FACILITY.FACILITY_NAME` is `NOT NULL`, but the fixture seeds facility asset 8003
  (on L97339) with no name; `find-locations`/`get-location` map `FACILITY_NAME IS
NULL → 'N/A'`. Rather than fabricate a facility name (inventing data) just to
  satisfy NOT NULL, `FACILITY_NAME` is reproduced as `VARCHAR2(100)` **NULL**
  (annotated `-- real: NOT NULL; kept nullable so the seeded name-less facility 8003
yields 'N/A'`). Third intentional divergence (with D4's CPH-view and
  FEATURE_INVOLVEMENT.CPH width).
- **D14 — Complete the referentially-incomplete location data (resolve fidelity vs
  current-results tension in favour of fidelity).** The current fixtures omit
  `FEATURE` rows for all but 91001/91002 and `ASSET` rows for all but 93001–93003, so
  the location queries' INNER JOIN to `FEATURE` (and the `unit_type` CASE on
  `ASSET.ASSET_PK`) make L97339 and other seeded locations return **nothing / 'N/A'**
  today. Adding the real in-scope FKs (`LOCATION/FEATURE_*/ASSET_LOCATION →
FEATURE`, `*/ASSET_LOCATION/ASSET_STATE/LIVESTOCK_UNIT/FACILITY → ASSET`,
  `ASSET → ANIMAL`) requires those parent rows. We **add them** (D10), which
  completes the data so those locations return their intended seeded content (e.g.
  L97339 surfaces livestock U000010/U000020 with species 'N/A' and facility U000030),
  matching the fixture author's evident intent and the `{locationId}.md` doc. This is
  chosen over omitting the FKs because: (a) "relationships correct" is an explicit
  user goal; (b) leaving the FKs out would keep the fixture referentially broken; (c)
  the Jest suite is mocked, so "integration tests continue to pass" holds regardless;
  (d) the change only _adds_ rows to location-query output for previously-inert
  locations — it never alters find-holding(s)/find-customers/ref/units results (those
  queries don't join the completed parents — verified). The location-query before→
  after delta is captured in the Stage-1 baseline and reported explicitly so the user
  is not surprised. Queries unaffected by the completion remain byte-identical.

## Backfill value conventions (deterministic, query-neutral)

To remove implementation ambiguity, all NOT NULL backfills use these fixed
conventions (none are SELECTed/filtered by any query unless noted; verified in
container per stage):

- **Surrogate PKs for state rows:** `FEATURE_STATE_PK = feature_pk`, `PARTY_STATE_PK
= party_pk`, `ASSET_STATE_PK = asset_pk` (1:1, deterministic, dup-safe).
- **Surrogate PKs for other newly-keyed tables (not state tables):**
  `PARTY_VERSION_PK = party_pk`; `FEATURE_ADDRESS_PK = feature_pk` (each feature has
  one address row in the seed); `FEATURE_POINT_PK = feature_pk`; `ASSET_LOCATION_PK =
feature_pk * 100000 + asset_pk`-style deterministic combination (the seed pairs are
  unique); `FEATURE_INVOLVEMENT_PK = feature_pk` (each feature has exactly one
  CPHHOLDERSHIP FI row in the seed — verified — so feature_pk is a unique FI key; ALL
  `INSERT INTO feature_involvement` sites across 001/002/003/005 are changed to supply
  this explicit PK once the IDENTITY default is dropped).
  `ADDRESS_USAGE_PK = party_contact_address_pk` for the 6 existing rows (81001,
  81002, 81003, 82001, 82002, 82003) — each `party_contact_address_pk` carries
  exactly one usage row in the seed (the canonical schema has no unique index on
  `PARTY_CONTACT_ADDRESS_PK` alone, so this 1:1 mapping is a seed property, not a
  schema guarantee; if a future seed adds a second usage row per PCA the scheme must
  change — noted).
- **Dates/datetimes (neutral past):** all new `*_FROM_DATE` = `DATE '2000-01-01'`
  (incl. `TELECOM_ADDRESS_FROM_DATE`, `ADDRESS_FROM_DATE`, `PARTY_CONTACT_FROM_DATE`,
  `PARTY_ROLE_FROM_DATE`, the ref-data `EFFECTIVE_FROM_DATE`s, etc.); all new
  `*_FROM_DTTM` and `PARTY_VERSION_FROM_DATETIME` = `TIMESTAMP '2000-01-01 00:00:00'`.
- **PARTY_ROLE:** `ROLE_PK = 0` (constant sentinel — ROLE table & FK omitted per D2,
  so any number is valid); `MAIN_ROLE_TYPE = 'KEEPER'` (no CHECK on this column in
  canonical schema); `PARTY_ROLE_FROM_DATE = DATE '2000-01-01'`.
- **PARTY:** `PARTY_TYPE` = `'PERSON'` or `'ORGANISATION'` matching the row's
  existing party_version type, else `'PERSON'`. **D8 orphan-holdership parties** use
  `PARTY_ID` prefixed `FIX-<feature_pk>` (e.g. `FIX-5001`) so they never collide
  with the `CUST-…`/`C…`/`O…` ids that `find-customers` binds to, and their
  `PARTY_ROLE_TO_DATE = DATE '2000-01-01'` (past) so `find-holding(s)` excludes them.
- **CHAR(1) indicator columns** (NON_POSTAL_ADDRESS_IND, NON_PAF_FILE_ADDRESS_IND,
  COMMON_LAND_INDICATOR, RIGHT_OF_WAY_INDICATOR, REGULAR_IMPORTER_INDICATOR, etc.):
  `'N'` unless a query depends on a specific value (PRIMARY_FEATURE_POINT_IND keeps
  its seeded `'Y'`).
- **Type strings:** `FEATURE_TYPE = 'LOCATION'`, `ASSET_TYPE = 'LIVESTOCKUNIT'` or
  `'FACILITY'` matching the asset's role, `ANIMAL_TYPE = 'COLLECTION'`,
  `FEATURE_POINT_TYPE = 'POINT'`, `ADDRESS_TYPE = 'POSTAL'`,
  `REF_DATA_SET_MAP_TYPE = 'CE'`, `ADDRESS_USAGE`/`TELECOM`/etc. types preserve their
  existing seeded values. `TRACING_PRIORITY = 0`. `BUSINESS_DOMAIN`/`DATA_TYPE` on
  REF_DATA_SET = `'REFERENCE'`. `ORGANISATION_TYPE = 'COMPANY'` (no CHECK on this
  column in the canonical schema — the only ORGANISATION CHECK is on
  `HEAD_OFFICE_INDICATOR`).
- **ASSET_LOCATION_PK** uses `feature_pk * 100000 + asset_pk`; verified collision-free
  because every seeded `asset_pk < 100000` (max 93003), so the product is unique per
  (feature_pk, asset_pk) pair — confirmed in-container against the real
  `PK_ASSET_LOCATION`.
- **ADDRESS_USAGE_PK** scheme carries a `-- NOTE: 1:1 with party_contact_address_pk
holds for current seed only` inline marker so the assumption is visible in the
  committed SQL.
- **FACILITY_NAME is NOT backfilled** — see D13. The two currently-NULL facility rows
  (active asset 8003 on L97339, inactive control 8004) keep `FACILITY_NAME = NULL`.

## Stages

Each stage keeps the container boot-green (clean init of 001–008 + identical AHBRP
query results), verified via `scripts/verify-sam-fixtures.sh` (D11).

### Stage 1 — DDL consolidation, ordering, baseline & verification harness

No constraint/type changes yet (pure structural refactor + tooling). NOTE: "keeping
current column shapes" freezes only the _DDL_ in Stage 1; the _seed_ blocks
(including 001's) are progressively rewritten in Stages 2–4 as each cluster's
constraints land — so the D6 state-row rewrites and other backfills in 001's seed
section are expected later, not frozen.

- Capture the **baseline**: boot the current fixtures, run every in-scope AHBRP
  query with representative binds, save outputs under `.design/sam-fixture-baseline/`.
- Add `scripts/verify-sam-fixtures.sh` (boot throwaway container, assert no `ORA-`
  in init log, run queries, diff vs baseline).
- Restructure `001` to the D9 section layout (all-DROPs-first → ordered CREATEs →
  ordered seed → view), **keeping the current column shapes** (the union of columns
  all files currently rely on, so all later 002/004 `ALTER`s no-op). Relocate the
  `ADDRESS` and party-cluster `CREATE TABLE`s from 002/004 into 001; remove the
  redundant create/alter blocks from 002/004 (seed-only thereafter).
  Files: `001`, `002`, `004`, `005` (only DDL relocation), new `scripts/verify-sam-fixtures.sh`,
  new `.design/sam-fixture-baseline/`.
  Acceptance criteria:
- Clean boot from empty volume; 001–008 apply with zero `ORA-` errors.
- `scripts/verify-sam-fixtures.sh` passes; baseline diff empty.
- No app/query/test files changed.

### Stage 2 — Reference-data cluster → canonical

Tables: REF_DATA_SET, REF_DATA_SET_MAP, REF_DATA_CODE, REF_DATA_CODE_DESC,
REF_DATA_CODE_MAP.

- Canonical columns/types/PKs/CHECKs (REF_DATA_SET gains DATA_TYPE, BUSINESS_DOMAIN,
  IS_LDSSM_COMPLIANT_IND, IS_MASTERED_BY_DOMAIN_IND, EFFECTIVE_FROM_DATE, …;
  REF_DATA_CODE_DESC PK → `(REF_DATA_CODE_PK, LANGUAGE_CODE)`; REF_DATA_SET_MAP gains
  FROM/TO_REF_DATA_SET_PK NOT NULL + REF_DATA_SET_MAP_TYPE CHECK; REF_DATA_CODE gains
  EFFECTIVE_FROM_DATE; CODE width per D5).
- In-scope FKs with corrected parent columns (the canonical DDL erroneously names
  the child column as the parent column; correct each to the real PK):
  `REF_DATA_CODE.REF_DATA_SET_PK → REF_DATA_SET(REF_DATA_SET_PK)`;
  `REF_DATA_CODE_DESC.REF_DATA_CODE_PK → REF_DATA_CODE(REF_DATA_CODE_PK)`;
  `REF_DATA_CODE_MAP.REF_DATA_SET_MAP_PK → REF_DATA_SET_MAP(REF_DATA_SET_MAP_PK)`,
  `REF_DATA_CODE_MAP.FROM_REF_DATA_CODE_PK → REF_DATA_CODE(REF_DATA_CODE_PK)`,
  `REF_DATA_CODE_MAP.TO_REF_DATA_CODE_PK → REF_DATA_CODE(REF_DATA_CODE_PK)`;
  `REF_DATA_SET_MAP.FROM_REF_DATA_SET_PK → REF_DATA_SET(REF_DATA_SET_PK)`,
  `REF_DATA_SET_MAP.TO_REF_DATA_SET_PK → REF_DATA_SET(REF_DATA_SET_PK)`.
  Omit →ORGANISATION (D2) and →REF_DATA_SUBSET (out of scope).
- Real unique/non-unique indexes (UK*RDSE_REF_DATA_SET_NAME, UK_RDCO*…_CODE,
  UK_RDCM_…, etc.). Verify no seed violates them — audit every `ref_data_set`,
  `ref_data_code` and `ref_data_code_map` insert across 001/002/003/005/006 for
  duplicate `REF_DATA_SET_NAME`, duplicate `(REF_DATA_SET_PK, CODE)`, and duplicate
  map tuples, duplicate `REF_DATA_CODE_PK` values across files, AND duplicate
  `(REF_DATA_CODE_PK, LANGUAGE_CODE)` desc pairs (REF_DATA_CODE_DESC's new composite
  PK — seeds use `LANGUAGE_CODE='ENG'`, real width VARCHAR2(20), one ENG desc per
  code, so it holds; confirm). (The new PK + unique indexes turn collisions the
  dup-swallow idiom currently hides into boot errors.) NOTE: no `REF_DATA_SET_NAME`
  duplicate exists today
  (each set name — `LOCAL_AUTHORITY`, `COUNTY`, `ANIMAL_SPECIES`, `FACILITY_TYPE`,
  `FACILITY_BUSINESS_ACTIVITY`, `WORK_AREA`, `BCF_ANIMAL_SPECIES` — is inserted once),
  but the audit must confirm this still holds after the rewrite.
- Seed backfill across 001/002/003/005/006: new NOT NULLs + the two
  FROM/TO_REF_DATA_SET_PK on the single ref_data_set_map row (point at existing
  in-scope sets) + REF_DATA_SET_MAP_TYPE. Preserve all EFFECTIVE_TO_DATE values
  (`NULL` for sets, `9999-12-31` for codes — queries filter on these).
  Files: `001`, `002`, `003`, `005`, `006` (AHBRP ref-data block).
  Acceptance criteria:
- Boot green; ref tables canonical; no unique-index violation across all inserts.
- `get-workarea-code-mapping`, `get-purpose-species-code-mapping`, the
  `LOCAL_AUTHORITY`/`COUNTY` and species/facility ref lookups in find-holding(s)/
  find-locations/get-location/find-customers return identical rows; baseline diff
  empty for these.

### Stage 3 — Party / customer cluster → canonical

Tables: PARTY, PARTY_ROLE, PARTY_STATE, PARTY_VERSION, PERSON, ORGANISATION,
ALT_PARTY_IDENTITY, ADDRESS, ADDRESS_USAGE, TELECOM_ADDRESS, PARTY_CONTACT_ADDRESS,
BS7666_ADDRESS.

- Canonical columns/types/PKs/CHECKs/indexes. Notable: PARTY +PARTY_TYPE & migration/
  password/ind cols & CKs; PARTY_ROLE +ROLE_PK (NOT NULL, ROLE FK omitted per D2)
  +MAIN_ROLE_TYPE +PARTY_ROLE_FROM_DATE; PARTY_STATE/ADDRESS_USAGE surrogate PKs +
  FROM dates; PARTY_VERSION +PARTY_VERSION_PK (PK) +PARTY_VERSION_FROM_DATETIME,
  datetime cols → TIMESTAMP(3) (**verify `= '31-DEC-9999'` equality empirically; if
  NLS-fragile, keep DATE and document — see Risks**); ADDRESS +ADDRESS_TYPE +2 NOT
  NULL IND (CK 'Y'/'N') +ADDRESS_FROM_DATE; BS7666_ADDRESS canonical column order
  (SAON before PAON), suffixes → CHAR(1), widths to real, FK→ADDRESS;
  TELECOM_ADDRESS +TELECOM_ADDRESS_FROM_DATE (NOT NULL);
  PARTY_CONTACT_ADDRESS +PARTY_ROLE_PK +PARTY_CONTACT_FROM_DATE +4 FKs;
  ORGANISATION +ORGANISATION_TYPE (NOT NULL) +CK.
- In-scope FKs (corrected); ROLE FK omitted.
- Seed backfill across 002/003/004/005 (incl. PARTY_ID width per D5). Seed parent
  `ADDRESS` rows for every BS7666_ADDRESS lacking one. Enumerated BS7666 rows:
  9001/9002 (001), 92001/92002 (005) — these lack an ADDRESS parent and need one
  seeded; 71001/71003 (004) already have ADDRESS parents; 71002 (004) has an ADDRESS
  parent but intentionally no BS7666 row (the "empty addresses" case). Confirm this is
  the complete set so BS7666→ADDRESS holds for all rows.
  Files: `001`, `002`, `003`, `004`, `005`.
  Acceptance criteria:
- Boot green; party-cluster tables canonical.
- `find-customers` / `get-customer-types` return identical rows for C123456, C234567,
  O123456 (person/org split, contacts, address, county, alt-party-identity).
- `find-holding(s)` party/party_role/party_state joins resolve the same active
  holderships, including the 003 `party_state_to_dttm IS NULL` cases; baseline diff
  empty.

### Stage 4 — Feature / location / asset cluster → canonical

Tables: FEATURE, FEATURE_INVOLVEMENT, FEATURE_STATE, FEATURE_ADDRESS, FEATURE_POINT,
LOCATION, ASSET, ASSET_LOCATION, ASSET_STATE, LIVESTOCK_UNIT, FACILITY,
FACILITY_TYPE, FACILITY_BUSINESS_ACTIVTY, ANIMAL, ANIMAL_SPECIES,
COLL_REGSTRD_ANIMAL_GROUP. (CPH per D4.)

- Canonical columns/types/PKs/CHECKs/indexes. Notable: FEATURE +FEATURE_TYPE (NOT
  NULL) +nullable cols; FEATURE_INVOLVEMENT +FEATURE_INVOLVEMENT_PK (PK),
  PARTY_ROLE_PK → NOT NULL (see D8), +FEATURE_INVOLV_FROM_DATE, CPH per D4 (FK+CHECK
  omitted); FEATURE_STATE/ASSET_STATE surrogate PKs + FROM_DTTM (D6); FEATURE_ADDRESS
  surrogate PK +FEATURE_ADDRESS_FROM_DATE (replaces composite PK); FEATURE_POINT
  +FEATURE_POINT_PK (PK) +FEATURE_POINT_TYPE +FEATURE_POINT_FROM_DATE +EASTING/NORTHING,
  IND→CHAR(1) CK; LOCATION +2 IND CKs +UK(LOCATION_ID); ASSET +ASSET_TYPE +UNIT_TYPE
  +UK(ANIMAL_PK); ASSET_LOCATION +ASSET_LOCATION_PK (PK) +ASSET_LOCATION_FROM_DATE;
  LIVESTOCK_UNIT +REGULAR_IMPORTER_INDICATOR (NOT NULL CK) +UK(UNIT_ID); FACILITY
  +UK(UNIT_ID) but FACILITY_NAME kept **NULLABLE** per D13; FACILITY_TYPE/FACILITY_BUSINESS_ACTIVTY/
  ANIMAL/ANIMAL_SPECIES gain FROM_DATE / TRACING_PRIORITY / ANIMAL_TYPE / etc. Keep
  the canonical misspelling `FACILITY_BUSINSS_ACTVTY_CODE`. COLL_REGSTRD_ANIMAL_GROUP
  is already at canonical shape (PK `ANIMAL_PK`, `USUAL_QUANTITY_OF_ANIMALS`); add the
  FK→ANIMAL — its only seed rows (animals 93001001/93003001, 005) reference existing
  ANIMAL rows, so the FK holds.
- In-scope FKs (corrected); omit DOCUMENT, BREED, TEMP_CPH, ACTIVITY_CLASS_PARTY_ROLE,
  FACILITY_SUB_BSNSS_ACTVTY, CPH FKs (documented).
- D10 parent-row backfill: FEATURE rows for all referenced feature_pks; ASSET rows
  for all referenced asset_pks; ANIMAL/ANIMAL_SPECIES where referenced.
- D8 party chains (past-dated PARTY_ROLE_TO_DATE) for previously-orphan
  feature_involvements; enumerate each and confirm find-holding(s) still excludes
  them while find-locations still shows the CPH.
- D6 state-table MERGE→deterministic-insert rewrites; ensure exactly one open row
  per feature/asset.
- Seed backfill across 001/002/003/005 for all new NOT NULLs (FEATURE_TYPE,
  FROM dates, ASSET_TYPE, REGULAR_IMPORTER_INDICATOR, TRACING_PRIORITY, ANIMAL_TYPE,
  FEATURE_POINT_TYPE, surrogate PKs). FACILITY_NAME is left NULL (D13). Preserve
  negative controls (inactive feature 5999, inactive asset 8004, SECONDARYLOCATION
  asset 8005, which is SECONDARYLOCATION) so they stay excluded; note that inactive
  asset 8004 is NOT excluded by the facility-branch query (see acceptance criteria).
  Files: `001`, `002`, `003`, `005`.
  Acceptance criteria:
- Boot green; feature/asset tables canonical.
- `find-locations` / `get-location`: **L98001/L98002 byte-identical** to baseline
  (their parents already existed). **Previously-inert locations now return their
  seeded data** (per D14) — confirm L97339 returns its two livestock units
  (U000010/U000020, species 'N/A' per D10) and facility U000030 (facility_name 'N/A'
  per D13), plus address/os_map_reference/county/cph as seeded; the SECONDARYLOCATION
  control (asset 8005) is excluded (filtered by `ASSET_LOCATION_TYPE='PRIMARYLOCATION'`
  in TARGET_PRIMARY_ASSET_LOCATION). **NOTE — the inactive facility control (asset
  8004 / U999999) is NOT excluded from the rowset**: the facility branch's row is
  driven by the FACILITY/ASSET_LOCATION join, and the `<>'INACTIVE'` predicate lives
  in the `ASSET_STATE` LEFT JOIN ON-clause, so 8004 surfaces with `unit_type='F'`,
  `unit_id='U999999'`, and `facility_name/type/business_activity='N/A'` (state +
  FACILITY_BUS columns nulled). This is pre-existing query behaviour exposed by the
  D14 completion, not new query logic; record it in the D14 delta. Confirm LNOASSET
  returns its address-only row. Record the full before→after delta.
- `find-holding(s)` resolves the same active holderships (01/001/0001 excluded as
  today, 45/001/0002, 01/409/1111 ×, 04/432/1234, 11/111/1111, 22/222/2222,
  33/333/3333, 98/001/0001, 98/002/0001) and still excludes 99/999/9999; baseline
  diff empty.

### Stage 5 — PEGA ref-data alignment & full final verification

- Confirm 006's AHBRP ref-data block (WORK_AREA / BCF_ANIMAL_SPECIES) matches the
  Stage-2 ref schema and the `CONNECT ahbrp` / `CONNECT pega_data` switches still
  work; PEGA tables (006/007/008) structurally untouched.
- Full clean-volume boot 001–008, zero `ORA-`.
- `scripts/verify-sam-fixtures.sh` green; baseline diff empty for the queries
  independent of the D14 completion (find-holding, find-holdings, find-customers,
  get-customer-types, get-purpose-species-code-mapping, get-workarea-code-mapping,
  get-units); for find-locations/get-location the diff is the **expected, documented
  superset** from D14 (previously-inert locations now return seeded rows; L98001/
  L98002 unchanged) — confirm no _unexpected_ changes beyond that delta. Note:
  `find-workorders`/`get-workorders` are PEGA
  queries, but their result mapping reads AHBRP work-area/species ref-data — confirm
  those mappings are unaffected by running `get-workarea-code-mapping` with
  `WORKAREA_CODES` ∈ {`Tuberculosis`, `General Inspection`, `Disease Investigation`}
  and `get-purpose-species-code-mapping` with `PURPOSE_SPECIES_CODES` ∈ {`Cattle`,
  `Sheep`, `Mixed`} against the booted DB, diffing vs baseline.
  Files: `001`, `006`, verification touches all.
  Acceptance criteria:
- Clean boot; 001–008 apply with no errors.
- Baseline diff empty for all AHBRP queries except the expected, documented
  find-locations/get-location superset from D14; PEGA query results unchanged.
- `git status` shows no untracked or modified files outside these four path
  prefixes: `.docker-compose/oracledb/`, the plan file, `scripts/verify-sam-fixtures.sh`,
  and `.design/sam-fixture-baseline/`.

## Risks

- **Width/constraint reductions rejecting seed data** (mitigated by D5 audit + per-
  stage container verification).
- **State-table PK change** altering matched rows / fanning out LEFT JOINs (mitigated
  by D6 single-open-row-per-entity + verification).
- **find-holding cardinality drift** from PARTY_ROLE_PK NOT NULL (mitigated by D8).
- **FK ordering** at apply time (mitigated by D9 all-drops-first + dependency-ordered
  creates + D10 parent rows).
- **TIMESTAMP(3) vs `'31-DEC-9999'` NLS comparison** in find-customers/get-customer-
  types (mitigated by empirical container check in Stage 3). Concrete fallback rule:
  if the Stage-3 container smoke test emits `ORA-01830`/`ORA-01858` or the
  `party_version_to_datetime = '31-DEC-9999'` predicate returns 0 rows for a known
  customer, revert PARTY_VERSION's datetime columns to `DATE` and record it as a
  documented divergence (the column is only equality-matched against the sentinel,
  never returned).
- **CHAR(1) vs VARCHAR2(1)** blank-padding on IND columns changing an equality/
  inequality result (mitigated by verification; `= 'Y'` / `<> 'INACTIVE'` are
  unaffected by trailing-blank semantics).

## Reviewer pushback (rejected / resolved differently)

- **opencode (round 5) — "unit_type / location drift; the only binding-constraint-
  consistent option is to OMIT the `*→ASSET` (and by extension `*→FEATURE`) FKs."**
  _Finding accepted_ (the drift is real and was empirically confirmed: only
  91001/91002 have FEATURE rows and only 93001–93003 have ASSET rows today, so most
  seeded locations are inert). _Recommended resolution rejected._ Omitting the FKs
  would leave the fixture referentially broken, directly contradicting the user's
  explicit "relationships correct" / "almost identical SAM Database" goal. Instead
  (D14) we complete the missing parent rows and keep the FKs; the actual binding
  constraint — Jest "integration tests continue to pass" — holds because that suite
  is mocked, and the only consequence (previously-inert locations now return their
  intended seeded data) is documented as a deliberate completion and reported to the
  user. Queries not touching the completed parents stay byte-identical.

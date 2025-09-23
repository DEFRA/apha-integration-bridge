-- ─────────────────────────────────────────────────────────────────────────────
--  002_add_cph_holder_id.sql
--  Adds CPH 04/432/1234 + minimal party chain to exercise updated knex query
--  (joins to PARTY_ROLE / PARTY / PARTY_STATE with the required filters)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Switch into the default pluggable DB and schema
ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Minimal PARTY tables required by the updated query
--    (CREATE if missing; ignore error if already present)
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN EXECUTE IMMEDIATE '
  CREATE TABLE party (
    party_pk   NUMBER       PRIMARY KEY,
    party_id   VARCHAR2(50) NOT NULL
  )';
EXCEPTION WHEN OTHERS THEN NULL; END;
/

BEGIN EXECUTE IMMEDIATE '
  CREATE TABLE party_role (
    party_role_pk      NUMBER       PRIMARY KEY,
    party_pk           NUMBER       NOT NULL,
    party_role_to_date DATE
  )';
EXCEPTION WHEN OTHERS THEN NULL; END;
/

BEGIN EXECUTE IMMEDIATE '
  CREATE TABLE party_state (
    party_pk             NUMBER       NOT NULL,
    party_status_code    VARCHAR2(20) NOT NULL,
    party_state_to_dttm  DATE
  )';
EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- Helpful indexes (no-op if already exist)
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_pr_party_pk ON party_role (party_pk)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_ps_party_pk ON party_state (party_pk)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Link FEATURE_INVOLVEMENT to PARTY_ROLE (new column + index)
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE feature_involvement ADD (party_role_pk NUMBER)';
EXCEPTION WHEN OTHERS THEN NULL;  -- swallow if column already exists
END;
/
BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_fi_party_role_pk ON feature_involvement (party_role_pk)';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Ensure base CPH row exists in the AHBRP.CPH view source
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN
  INSERT INTO v_cph_customer_unit (cph, cph_type)
  VALUES ('04/432/1234', 'HOLDER_TEST');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Reference Data: map SUBSTR(CPH,1,6) = '04/432' to an LA code/desc
--     (meets DATE '9999-12-31' effective-to-date filters)
-- ─────────────────────────────────────────────────────────────────────────────
-- rdc (laNumber) + rdcd (laName)
BEGIN
  INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date)
  VALUES (10432, 'LA04432', DATE '9999-12-31');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/
BEGIN
  INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description)
  VALUES (10432, 'Local Authority 04/432');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/
-- rdc1 (county/parish) = '04/432'
BEGIN
  INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date)
  VALUES (20432, '04/432', DATE '9999-12-31');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/
-- map rdc -> rdc1 in the existing set (id 1 created in 001 script)
BEGIN
  INSERT INTO ref_data_code_map (
    ref_data_code_map_pk, ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk, effective_to_date
  ) VALUES (
    30432, 1, 10432, 20432, DATE '9999-12-31'
  );
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) Seed PARTY chain and wire into a new feature for CPH 04/432/1234
--    Required WHEREs to satisfy:
--      - PR.PARTY_ROLE_TO_DATE IS NULL
--      - PS.PARTY_STATUS_CODE <> 'INACTIVE'
--      - PS.PARTY_STATE_TO_DTTM IS NOT NULL    ← (set to a non-null date)
--      - FS.FEATURE_STATE_TO_DTTM IS NULL
-- ─────────────────────────────────────────────────────────────────────────────
DECLARE
  v_party_pk       NUMBER := 50010;
  v_party_role_pk  NUMBER := 51010;
  v_feature_pk     NUMBER := 7432;   -- unique vs earlier 5001/5002/5999/6409/7003/7004
BEGIN
  -- PARTY + ROLE + STATE
  BEGIN
    INSERT INTO party (party_pk, party_id) VALUES (v_party_pk, 'CUST-044321234');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date)
    VALUES (v_party_role_pk, v_party_pk, NULL);
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm)
    VALUES (v_party_pk, 'ACTIVE', DATE '2020-01-01');  -- NOT NULL to meet filter
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- FEATURE graph for CPH 04/432/1234
  BEGIN
    INSERT INTO feature_involvement (
      feature_pk, cph, feature_involvement_type, feature_involv_to_date, party_role_pk
    ) VALUES (
      v_feature_pk, '04/432/1234', 'CPHHOLDERSHIP', NULL, v_party_role_pk
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO location (feature_pk, location_id) VALUES (v_feature_pk, 'LOC-GAMMA');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm)
    VALUES (v_feature_pk, 'ACTIVE', NULL);  -- NULL to meet FS.FEATURE_STATE_TO_DTTM IS NULL
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
END;
/

COMMIT;
-- ─────────────────────────────────────────────────────────────────────────────
-- End 002_add_cph_holder_id.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill customer/party chain for existing test CPH 45/001/0002
-- Makes 45/001/0002 pass the updated knex query (party joins + filters)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

DECLARE
  v_party_pk       NUMBER := 50020;
  v_party_role_pk  NUMBER := 51020;
  v_feature_pk     NUMBER := 5002;           -- existing feature for 45/001/0002
BEGIN
  -- PARTY (idempotent)
  BEGIN
    INSERT INTO party (party_pk, party_id)
    VALUES (v_party_pk, 'CUST-450010002');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
  END;

  -- PARTY_ROLE (idempotent; must be open-ended → PARTY_ROLE_TO_DATE IS NULL)
  BEGIN
    INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date)
    VALUES (v_party_role_pk, v_party_pk, NULL);
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
  END;

  -- PARTY_STATE: ensure one row with NOT NULL to_dttm and non-INACTIVE status
  MERGE INTO party_state ps
  USING (
    SELECT v_party_pk AS party_pk,
           'ACTIVE'   AS party_status_code,
           DATE '2020-01-01' AS party_state_to_dttm
    FROM dual
  ) src
  ON (ps.party_pk = src.party_pk)
  WHEN MATCHED THEN UPDATE
    SET ps.party_status_code   = src.party_status_code,
        ps.party_state_to_dttm = src.party_state_to_dttm
  WHEN NOT MATCHED THEN INSERT (party_pk, party_status_code, party_state_to_dttm)
    VALUES (src.party_pk, src.party_status_code, src.party_state_to_dttm);

  -- Backfill FEATURE_INVOLVEMENT with the PARTY_ROLE_PK (idempotent)
  UPDATE feature_involvement fi
     SET fi.party_role_pk = v_party_role_pk
   WHERE fi.feature_pk = v_feature_pk
     AND fi.cph = '45/001/0002'
     AND fi.feature_involvement_type = 'CPHHOLDERSHIP'
     AND (fi.party_role_pk IS NULL OR fi.party_role_pk <> v_party_role_pk);

  -- Keep FEATURE_STATE row compliant (ACTIVE, to_dttm IS NULL)
  UPDATE feature_state fs
     SET fs.feature_status_code   = 'ACTIVE',
         fs.feature_state_to_dttm = NULL
   WHERE fs.feature_pk = v_feature_pk;
END;
/

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill customer/party chain for existing test CPH 01/409/1111
-- Makes 01/409/1111 pass the updated knex query (party joins + filters)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

DECLARE
  v_party_pk       NUMBER := 50030;
  v_party_role_pk  NUMBER := 51030;
  v_feature_pk     NUMBER := 6409;           -- existing feature for 01/409/1111
BEGIN
  -- Ensure the CPH exists in the base table (idempotent)
  BEGIN
    INSERT INTO v_cph_customer_unit (cph, cph_type)
    VALUES ('01/409/1111', 'MULTI_LOC_TEST');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
  END;

  -- PARTY (idempotent)
  BEGIN
    INSERT INTO party (party_pk, party_id)
    VALUES (v_party_pk, 'CUST-014091111');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
  END;

  -- PARTY_ROLE (open-ended → PARTY_ROLE_TO_DATE IS NULL)
  BEGIN
    INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date)
    VALUES (v_party_role_pk, v_party_pk, NULL);
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
  END;

  -- PARTY_STATE: NOT NULL to_dttm and non-INACTIVE status
  MERGE INTO party_state ps
  USING (
    SELECT v_party_pk AS party_pk,
           'ACTIVE'   AS party_status_code,
           DATE '2020-01-01' AS party_state_to_dttm
    FROM dual
  ) src
  ON (ps.party_pk = src.party_pk)
  WHEN MATCHED THEN UPDATE
    SET ps.party_status_code   = src.party_status_code,
        ps.party_state_to_dttm = src.party_state_to_dttm
  WHEN NOT MATCHED THEN INSERT (party_pk, party_status_code, party_state_to_dttm)
    VALUES (src.party_pk, src.party_status_code, src.party_state_to_dttm);

  -- Wire FEATURE_INVOLVEMENT with PARTY_ROLE_PK (idempotent)
  UPDATE feature_involvement fi
     SET fi.party_role_pk = v_party_role_pk
   WHERE fi.feature_pk = v_feature_pk
     AND fi.cph = '01/409/1111'
     AND fi.feature_involvement_type = 'CPHHOLDERSHIP'
     AND (fi.party_role_pk IS NULL OR fi.party_role_pk <> v_party_role_pk);

  -- If the FI row didn’t exist (unexpected), insert it
  IF SQL%ROWCOUNT = 0 THEN
    BEGIN
      INSERT INTO feature_involvement (
        feature_pk, cph, feature_involvement_type, feature_involv_to_date, party_role_pk
      ) VALUES (
        v_feature_pk, '01/409/1111', 'CPHHOLDERSHIP', NULL, v_party_role_pk
      );
    EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
    END;
  END IF;

  -- Keep FEATURE_STATE compliant (ACTIVE, to_dttm IS NULL)
  UPDATE feature_state fs
     SET fs.feature_status_code   = 'ACTIVE',
         fs.feature_state_to_dttm = NULL
   WHERE fs.feature_pk = v_feature_pk;
END;
/

COMMIT;
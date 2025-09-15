-- ─────────────────────────────────────────────────────────────────────────────
--  Local XE / Free init: create AHBRP objects for /locations endpoint
--  (idempotent; avoids CONNECT; safe for repeated dev runs)
-- ─────────────────────────────────────────────────────────────────────────────

-- You are executed as SYSDBA by the container. Work inside the PDB:
ALTER SESSION SET CONTAINER = FREEPDB1;

-- Ensure local users exist (AHBRP objects live in this schema; SAM is the reader)
DECLARE v_cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_cnt FROM all_users WHERE username = 'AHBRP';
  IF v_cnt = 0 THEN
    EXECUTE IMMEDIATE 'CREATE USER ahbrp IDENTIFIED BY "password"';
    EXECUTE IMMEDIATE 'GRANT CONNECT, RESOURCE, DBA TO ahbrp';
  END IF;

  SELECT COUNT(*) INTO v_cnt FROM all_users WHERE username = 'SAM';
  IF v_cnt = 0 THEN
    EXECUTE IMMEDIATE 'CREATE USER sam IDENTIFIED BY "password"';
    EXECUTE IMMEDIATE 'GRANT CONNECT, RESOURCE, DBA TO sam';
  END IF;

  SELECT COUNT(*) INTO v_cnt FROM all_users WHERE username = 'PEGA';
  IF v_cnt = 0 THEN
    EXECUTE IMMEDIATE 'CREATE USER pega IDENTIFIED BY "password"';
    EXECUTE IMMEDIATE 'GRANT CONNECT, RESOURCE, DBA TO pega';
  END IF;
END;
/
-- From here on, create objects in AHBRP without CONNECTing:
ALTER SESSION SET CURRENT_SCHEMA = AHBRP;

-- ─────────────────────────────────────────────────────────────────────────────
-- Drop / recreate minimal AHBRP structures used by the endpoints
-- (order chosen to avoid dependency issues; all blocks are idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN EXECUTE IMMEDIATE 'DROP TABLE asset_location PURGE';  EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE asset_state PURGE';     EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE facility PURGE';        EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE livestock_unit PURGE';  EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE feature_address PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE bs7666_address PURGE';  EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE location PURGE';        EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE feature_state PURGE';   EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- Core BS7666 address tables
CREATE TABLE bs7666_address (
  address_pk                   NUMBER       PRIMARY KEY,
  paon_start_number            NUMBER,
  paon_start_number_suffix     VARCHAR2(10),
  paon_end_number              NUMBER,
  paon_end_number_suffix       VARCHAR2(10),
  paon_description             VARCHAR2(255),
  saon_description             VARCHAR2(255),
  saon_start_number            NUMBER,
  saon_start_number_suffix     VARCHAR2(10),
  saon_end_number              NUMBER,
  saon_end_number_suffix       VARCHAR2(10),
  street                       VARCHAR2(255),
  locality                     VARCHAR2(255),
  town                         VARCHAR2(255),
  administrative_area          VARCHAR2(255),
  postcode                     VARCHAR2(20),
  uk_internal_code             VARCHAR2(20),
  country_code                 VARCHAR2(10)
);

CREATE TABLE feature_address (
  feature_pk               NUMBER      NOT NULL,
  address_pk               NUMBER      NOT NULL,
  feature_address_to_date  DATE,
  CONSTRAINT feature_address_pk PRIMARY KEY (feature_pk, address_pk)
);

-- Minimal asset model used by the API query
CREATE TABLE asset_location (
  feature_pk               NUMBER       NOT NULL,
  asset_pk                 NUMBER       NOT NULL,
  asset_location_type      VARCHAR2(50) NOT NULL,  -- e.g., 'PRIMARYLOCATION'
  asset_location_to_date   DATE
);

CREATE TABLE livestock_unit (
  asset_pk   NUMBER        PRIMARY KEY,
  unit_id    VARCHAR2(30)  NOT NULL
);

CREATE TABLE facility (
  asset_pk   NUMBER        PRIMARY KEY,
  unit_id    VARCHAR2(30)  NOT NULL
);

CREATE TABLE asset_state (
  asset_pk              NUMBER        NOT NULL,
  asset_status_code     VARCHAR2(20)  NOT NULL,    -- e.g., 'ACTIVE'
  asset_state_to_dttm   DATE
);

-- Feature / location graph
BEGIN
  EXECUTE IMMEDIATE 'CREATE TABLE feature_involvement (
    feature_pk                  NUMBER       PRIMARY KEY,
    cph                         VARCHAR2(50) NOT NULL,
    feature_involvement_type    VARCHAR2(50) NOT NULL,
    feature_involv_to_date      DATE
  )';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

-- ✅ Allow multiple locations per feature (composite PK)
CREATE TABLE location (
  feature_pk   NUMBER        NOT NULL,
  location_id  VARCHAR2(50)  NOT NULL,
  CONSTRAINT location_pk PRIMARY KEY (feature_pk, location_id)
);

CREATE TABLE feature_state (
  feature_pk             NUMBER       PRIMARY KEY,
  feature_status_code    VARCHAR2(20) NOT NULL,
  feature_state_to_dttm  DATE
);

-- Reference data tables (very slimmed down) – create if missing
BEGIN
  EXECUTE IMMEDIATE 'CREATE TABLE ref_data_set_map (
    ref_data_set_map_pk   NUMBER        PRIMARY KEY,
    ref_data_set_map_name VARCHAR2(100) NOT NULL,
    effective_to_date     DATE          NOT NULL
  )';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'CREATE TABLE ref_data_code (
    ref_data_code_pk  NUMBER        PRIMARY KEY,
    code              VARCHAR2(50)  NOT NULL,
    effective_to_date DATE          NOT NULL
  )';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'CREATE TABLE ref_data_code_desc (
    ref_data_code_pk  NUMBER        PRIMARY KEY,
    short_description VARCHAR2(255) NOT NULL
  )';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'CREATE TABLE ref_data_code_map (
    ref_data_code_map_pk   NUMBER       PRIMARY KEY,
    ref_data_set_map_pk    NUMBER       NOT NULL,
    from_ref_data_code_pk  NUMBER       NOT NULL,
    to_ref_data_code_pk    NUMBER       NOT NULL,
    effective_to_date      DATE         NOT NULL
  )';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

-- Helpful indexes
CREATE INDEX idx_fa_feature_pk ON feature_address (feature_pk);
CREATE INDEX idx_fa_address_pk ON feature_address (address_pk);
CREATE INDEX idx_al_feature_pk ON asset_location (feature_pk);
CREATE INDEX idx_al_asset_pk   ON asset_location (asset_pk);
CREATE INDEX idx_ass_asset_pk  ON asset_state (asset_pk);

-- ─────────────────────────────────────────────────────────────────────────────
-- Reference data to satisfy WHERE filters and joins (idempotent inserts)
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_set_map (ref_data_set_map_pk, ref_data_set_map_name, effective_to_date)
VALUES (1, ''LOCAL_AUTHORITY_COUNTY_PARISH'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- rdc: local authority numbers (returned as laNumber) + descriptions
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date) VALUES (101, ''LA01001'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description) VALUES (101, ''Local Authority 01/001'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date) VALUES (102, ''LA45001'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description) VALUES (102, ''Dev Sample LA 45/001'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- rdc1: county/parish codes (must equal SUBSTR(cph,1,6))
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date) VALUES (201, ''01/001'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date) VALUES (202, ''45/001'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- Maps: LA number (rdc) -> county/parish (rdc1)
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_map (ref_data_code_map_pk, ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk, effective_to_date)
VALUES (301, 1, 101, 201, DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_map (ref_data_code_map_pk, ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk, effective_to_date)
VALUES (302, 1, 102, 202, DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- Additional mapping for multi-location CPH 01/409/1111
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date) VALUES (103, ''LA01409'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description) VALUES (103, ''Local Authority 01/409'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date) VALUES (203, ''01/409'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_map (ref_data_code_map_pk, ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk, effective_to_date)
VALUES (303, 1, 103, 203, DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- Helpful indexes on reference data (ignore if already exist)
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_rdc_code      ON ref_data_code (code)';                EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_rdcm_to_pk    ON ref_data_code_map (to_ref_data_code_pk)';   EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_rdcm_from_pk  ON ref_data_code_map (from_ref_data_code_pk)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed data block A (from your branch): locations endpoint fixtures
-- ─────────────────────────────────────────────────────────────────────────────

-- Clean any prior seed rows (so we can re-run)
BEGIN EXECUTE IMMEDIATE 'DELETE FROM asset_location WHERE feature_pk IN (7003,7004)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DELETE FROM asset_state    WHERE asset_pk  IN (8001,8002,8003,8004,8005)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DELETE FROM livestock_unit WHERE asset_pk  IN (8001,8002,8005)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DELETE FROM facility       WHERE asset_pk  IN (8003,8004)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DELETE FROM feature_address WHERE feature_pk IN (7003,7004)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DELETE FROM bs7666_address WHERE address_pk IN (9001,9002)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DELETE FROM feature_state  WHERE feature_pk IN (7003,7004)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DELETE FROM location       WHERE feature_pk IN (7003,7004)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- Location node + active feature state
INSERT INTO location (feature_pk, location_id) VALUES (7003, 'L97339');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm)
VALUES (7003, 'ACTIVE', NULL);

-- BS7666 address (address_pk 9001) + active feature_address
INSERT INTO bs7666_address (
  address_pk, paon_start_number, paon_start_number_suffix, paon_end_number,
  paon_end_number_suffix, paon_description, saon_description, saon_start_number,
  saon_start_number_suffix, saon_end_number, saon_end_number_suffix, street,
  locality, town, administrative_area, postcode, uk_internal_code, country_code
) VALUES (
  9001, 12, NULL, NULL, NULL, 'Willow Barn', NULL, NULL, NULL, NULL, NULL,
  'Farm Lane', 'Westham', 'Exampletown', 'Devon', 'EX1 2AB', 'UKX123', 'GB'
);

INSERT INTO feature_address (feature_pk, address_pk, feature_address_to_date)
VALUES (7003, 9001, NULL);

-- Livestock units (two) on PRIMARYLOCATION, both ACTIVE
INSERT INTO livestock_unit (asset_pk, unit_id) VALUES (8001, 'U000010');
INSERT INTO asset_state    (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (8001, 'ACTIVE', NULL);
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date)
VALUES (7003, 8001, 'PRIMARYLOCATION', NULL);

INSERT INTO livestock_unit (asset_pk, unit_id) VALUES (8002, 'U000020');
INSERT INTO asset_state    (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (8002, 'ACTIVE', NULL);
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date)
VALUES (7003, 8002, 'PRIMARYLOCATION', NULL);

-- Facility (one) on PRIMARYLOCATION, ACTIVE
INSERT INTO facility     (asset_pk, unit_id) VALUES (8003, 'U000030');
INSERT INTO asset_state  (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (8003, 'ACTIVE', NULL);
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date)
VALUES (7003, 8003, 'PRIMARYLOCATION', NULL);

-- Negative control (should NOT appear: inactive asset on same location)
INSERT INTO facility     (asset_pk, unit_id) VALUES (8004, 'U999999');
INSERT INTO asset_state  (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (8004, 'INACTIVE', NULL);
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date)
VALUES (7003, 8004, 'PRIMARYLOCATION', NULL);

-- Negative control (should NOT appear: secondary location)
INSERT INTO livestock_unit (asset_pk, unit_id) VALUES (8005, 'U888888');
INSERT INTO asset_state    (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (8005, 'ACTIVE', NULL);
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date)
VALUES (7003, 8005, 'SECONDARYLOCATION', NULL);

-- Optional: Address-only location to test "no commodities/facilities" path
INSERT INTO location (feature_pk, location_id) VALUES (7004, 'LNOASSET');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm)
VALUES (7004, 'ACTIVE', NULL);

INSERT INTO bs7666_address (
  address_pk, paon_start_number, paon_start_number_suffix, paon_end_number,
  paon_end_number_suffix, paon_description, saon_description, saon_start_number,
  saon_start_number_suffix, saon_end_number, saon_end_number_suffix, street,
  locality, town, administrative_area, postcode, uk_internal_code, country_code
) VALUES (
  9002, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  'No Asset Street', NULL, 'Nowhereville', 'Somerset', 'ZZ1 1ZZ', 'UKX999', 'GB'
);

INSERT INTO feature_address (feature_pk, address_pk, feature_address_to_date)
VALUES (7004, 9002, NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed data block B (from main): CPH/location fixtures (+ multi-location case)
-- ─────────────────────────────────────────────────────────────────────────────

-- Feature graph for each existing test CPH
BEGIN EXECUTE IMMEDIATE 'INSERT INTO feature_involvement (feature_pk, cph, feature_involvement_type, feature_involv_to_date)
VALUES (5001, ''01/001/0001'', ''CPHHOLDERSHIP'', NULL)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO location (feature_pk, location_id) VALUES (5001, ''LOC-ALPHA'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm)
VALUES (5001, ''ACTIVE'', NULL)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

BEGIN EXECUTE IMMEDIATE 'INSERT INTO feature_involvement (feature_pk, cph, feature_involvement_type, feature_involv_to_date)
VALUES (5002, ''45/001/0002'', ''CPHHOLDERSHIP'', NULL)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO location (feature_pk, location_id) VALUES (5002, ''LOC-BETA'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm)
VALUES (5002, ''ACTIVE'', NULL)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- Negative control (inactive)
BEGIN EXECUTE IMMEDIATE 'INSERT INTO feature_involvement (feature_pk, cph, feature_involvement_type, feature_involv_to_date)
VALUES (5999, ''99/999/9999'', ''CPHHOLDERSHIP'', NULL)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO location (feature_pk, location_id) VALUES (5999, ''LOC-ZZ'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm)
VALUES (5999, ''INACTIVE'', NULL)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- Also wire a county/parish map so the joins succeed but the WHERE filters exclude it
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date) VALUES (1099, ''LA99999'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description) VALUES (1099, ''Control LA 99/999'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date) VALUES (2099, ''99/999'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_map (ref_data_code_map_pk, ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk, effective_to_date)
VALUES (3099, 1, 1099, 2099, DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- NEW: CPH 01/409/1111 with TWO locations on the SAME feature (multi-location)
BEGIN EXECUTE IMMEDIATE 'INSERT INTO v_cph_customer_unit (cph, cph_type) VALUES (''01/409/1111'', ''MULTI_LOC_TEST'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO feature_involvement (feature_pk, cph, feature_involvement_type, feature_involv_to_date)
VALUES (6409, ''01/409/1111'', ''CPHHOLDERSHIP'', NULL)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO location (feature_pk, location_id) VALUES (6409, ''LOC-OMEGA'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO location (feature_pk, location_id) VALUES (6409, ''LOC-THETA'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm)
VALUES (6409, ''ACTIVE'', NULL)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

COMMIT;

-- Helpful indexes (ignore if already exist)
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_fi_cph        ON feature_involvement (cph)';         EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_fi_feature_pk ON feature_involvement (feature_pk)';  EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_loc_feature_pk ON location (feature_pk)';            EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_fs_feature_pk  ON feature_state (feature_pk)';       EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants for test user "sam" (performed as SYS; no CONNECT required)
-- Guard each GRANT in case objects are not present in this container
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON ahbrp.v_cph_customer_unit TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON ahbrp.cph                 TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON ahbrp.feature_involvement TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON ahbrp.location            TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON ahbrp.feature_state       TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON ahbrp.ref_data_set_map    TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON ahbrp.ref_data_code       TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON ahbrp.ref_data_code_desc  TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON ahbrp.ref_data_code_map   TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON ahbrp.bs7666_address      TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON ahbrp.feature_address     TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON ahbrp.asset_location      TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON ahbrp.livestock_unit      TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON ahbrp.facility            TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON ahbrp.asset_state         TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

COMMIT;
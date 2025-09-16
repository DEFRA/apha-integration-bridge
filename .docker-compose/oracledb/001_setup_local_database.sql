-- ─────────────────────────────────────────────────────────────────────────────
--  Oracle XE container initialisation script for local development / testing
--  (updated to support expanded CPH lookup query + locations endpoint testing)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Switch into the default pluggable DB
ALTER SESSION SET CONTAINER = FREEPDB1;

-- 2) Create three local schemas (users)
BEGIN EXECUTE IMMEDIATE 'CREATE USER sam   IDENTIFIED BY "password"'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE USER pega  IDENTIFIED BY "password"'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE USER ahbrp IDENTIFIED BY "password"'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

BEGIN EXECUTE IMMEDIATE 'GRANT CONNECT, RESOURCE, DBA TO sam';  EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT CONNECT, RESOURCE, DBA TO pega'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT CONNECT, RESOURCE, DBA TO ahbrp';EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- 3) Build the base test table in schema AHBRP
CONNECT ahbrp/password@FREEPDB1;

-- Drop & recreate for idempotent dev runs (ignore errors if first run)
BEGIN
  EXECUTE IMMEDIATE 'DROP VIEW cph';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE v_cph_customer_unit PURGE';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

CREATE TABLE v_cph_customer_unit (
  cph                               VARCHAR2(50)  NOT NULL,
  location_id                       VARCHAR2(50),
  feature_name                      VARCHAR2(255),
  main_role_type                    VARCHAR2(100),
  person_family_name                VARCHAR2(100),
  person_given_name                 VARCHAR2(100),
  organisation_name                 VARCHAR2(255),
  party_id                          VARCHAR2(50),
  asset_id                          VARCHAR2(50),
  asset_location_type               VARCHAR2(50),
  asset_type                        VARCHAR2(50),
  animal_species_code               VARCHAR2(50),
  animal_group_id_mch_ext_ref       VARCHAR2(100),
  animal_group_id_mch_frm_dat       DATE,
  animal_group_id_mch_to_dat        DATE,
  animal_production_usage_code      VARCHAR2(50),
  asset_involvement_type            VARCHAR2(50),
  cph_type                          VARCHAR2(50),
  herdmark                          VARCHAR2(50),
  keeper_of_unit                    VARCHAR2(100),
  property_number                   VARCHAR2(50),
  postcode                          VARCHAR2(20),
  owner_of_unit                     VARCHAR2(100),
  CONSTRAINT v_cph_customer_unit_pk PRIMARY KEY (cph)
);

-- 4) Seed data (existing samples + rows your test query needs)
INSERT INTO v_cph_customer_unit
  (cph,          location_id, feature_name, main_role_type, person_family_name,
   person_given_name, organisation_name, party_id, asset_id, asset_location_type,
   asset_type,   animal_species_code, animal_group_id_mch_ext_ref,
   animal_group_id_mch_frm_dat, animal_group_id_mch_to_dat,
   animal_production_usage_code, asset_involvement_type, cph_type,
   herdmark, keeper_of_unit, property_number, postcode, owner_of_unit)
VALUES
  ('01/02/03','LOC001','Feature A','Role1','Smith','John','Org1','P001','A001',
   'Type1','Asset1','AS001','Ref001',
   TO_DATE('2021-01-01','YYYY-MM-DD'), TO_DATE('2021-12-31','YYYY-MM-DD'),
   'Usage1','Involvement1','TypeA','HM001','Keeper1','PN001','AB12 3CD','Owner1');

INSERT INTO v_cph_customer_unit
  (cph,          location_id, feature_name, main_role_type, person_family_name,
   person_given_name, organisation_name, party_id, asset_id, asset_location_type,
   asset_type,   animal_species_code, animal_group_id_mch_ext_ref,
   animal_group_id_mch_frm_dat, animal_group_id_mch_to_dat,
   animal_production_usage_code, asset_involvement_type, cph_type,
   herdmark, keeper_of_unit, property_number, postcode, owner_of_unit)
VALUES
  ('04/05/06','LOC002','Feature B','Role2','Doe','Jane','Org2','P002','A002',
   'Type2','Asset2','AS002','Ref002',
   TO_DATE('2022-01-01','YYYY-MM-DD'), TO_DATE('2022-12-31','YYYY-MM-DD'),
   'Usage2','Involvement2','TypeB','HM002','Keeper2','PN002','EF45 6GH','Owner2');

INSERT INTO v_cph_customer_unit
  (cph,          location_id, feature_name, main_role_type, person_family_name,
   person_given_name, organisation_name, party_id, asset_id, asset_location_type,
   asset_type,   animal_species_code, animal_group_id_mch_ext_ref,
   animal_group_id_mch_frm_dat, animal_group_id_mch_to_dat,
   animal_production_usage_code, asset_involvement_type, cph_type,
   herdmark, keeper_of_unit, property_number, postcode, owner_of_unit)
VALUES
  ('07/08/09','LOC003','Feature C','Role3','Brown','Charlie','Org3','P003','A003',
   'Type3','Asset3','AS003','Ref003',
   TO_DATE('2023-01-01','YYYY-MM-DD'), TO_DATE('2023-12-31','YYYY-MM-DD'),
   'Usage3','Involvement3','TypeC','HM003','Keeper3','PN003','IJ78 9KL','Owner3');

-- New minimal rows that your expanded query will join to
INSERT INTO v_cph_customer_unit (cph, cph_type) VALUES ('01/001/0001', 'UNIT_TEST');
INSERT INTO v_cph_customer_unit (cph, cph_type) VALUES ('45/001/0002', 'DEV_SAMPLE');

COMMIT;

-- 5) Indexes (unchanged)
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_location_id ON v_cph_customer_unit (location_id)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_postcode    ON v_cph_customer_unit (postcode)';     EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- 6) Lightweight view exposing just the columns your test query needs
CREATE OR REPLACE VIEW cph (CPH, CPH_TYPE) AS
SELECT cph, cph_type
FROM   v_cph_customer_unit;

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW: Minimal AHBRP structures to support the expanded query
--      (refactored so a single feature/CPH can have multiple locations)
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop if exist (dev-friendly)
BEGIN EXECUTE IMMEDIATE 'DROP TABLE feature_state PURGE';         EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE location PURGE';              EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE feature_involvement PURGE';   EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ref_data_code_map PURGE';     EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ref_data_code_desc PURGE';    EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ref_data_code PURGE';         EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ref_data_set_map PURGE';      EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- Core feature tables
CREATE TABLE feature_involvement (
  feature_pk                  NUMBER       PRIMARY KEY,
  cph                         VARCHAR2(50) NOT NULL,
  feature_involvement_type    VARCHAR2(50) NOT NULL,
  feature_involv_to_date      DATE
);

-- ✅ Refactor: allow multiple locations per feature (and thus per CPH)
CREATE TABLE location (
  feature_pk   NUMBER        NOT NULL,
  location_id  VARCHAR2(50)  NOT NULL,
  CONSTRAINT location_pk PRIMARY KEY (feature_pk, location_id)
);

-- Add feature_state_to_dttm to support locations endpoint filters
CREATE TABLE feature_state (
  feature_pk             NUMBER       PRIMARY KEY,
  feature_status_code    VARCHAR2(20) NOT NULL,
  feature_state_to_dttm  DATE
);

-- Reference data tables (very slimmed down)
CREATE TABLE ref_data_set_map (
  ref_data_set_map_pk   NUMBER        PRIMARY KEY,
  ref_data_set_map_name VARCHAR2(100) NOT NULL,
  effective_to_date     DATE          NOT NULL
);

CREATE TABLE ref_data_code (
  ref_data_code_pk  NUMBER        PRIMARY KEY,
  code              VARCHAR2(50)  NOT NULL,
  effective_to_date DATE          NOT NULL
);

CREATE TABLE ref_data_code_desc (
  ref_data_code_pk  NUMBER        PRIMARY KEY,
  short_description VARCHAR2(255) NOT NULL
);

CREATE TABLE ref_data_code_map (
  ref_data_code_map_pk   NUMBER       PRIMARY KEY,
  ref_data_set_map_pk    NUMBER       NOT NULL,
  from_ref_data_code_pk  NUMBER       NOT NULL,
  to_ref_data_code_pk    NUMBER       NOT NULL,
  effective_to_date      DATE         NOT NULL
);

-- Minimal reference data to satisfy WHERE filters and joins
INSERT INTO ref_data_set_map (ref_data_set_map_pk, ref_data_set_map_name, effective_to_date)
VALUES (1, 'LOCAL_AUTHORITY_COUNTY_PARISH', DATE '9999-12-31');

-- rdc: local authority numbers (what your query returns as laNumber)
INSERT INTO ref_data_code      (ref_data_code_pk, code,     effective_to_date) VALUES (101, 'LA01001', DATE '9999-12-31');
INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description)           VALUES (101, 'Local Authority 01/001');

INSERT INTO ref_data_code      (ref_data_code_pk, code,     effective_to_date) VALUES (102, 'LA45001', DATE '9999-12-31');
INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description)           VALUES (102, 'Dev Sample LA 45/001');

-- rdc1: county/parish codes (must equal SUBSTR(cph,1,6))
INSERT INTO ref_data_code (ref_data_code_pk, code,     effective_to_date) VALUES (201, '01/001', DATE '9999-12-31');
INSERT INTO ref_data_code (ref_data_code_pk, code,     effective_to_date) VALUES (202, '45/001', DATE '9999-12-31');

-- Map each LA number (rdc) to its county/parish (rdc1)
INSERT INTO ref_data_code_map (ref_data_code_map_pk, ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk, effective_to_date)
VALUES (301, 1, 101, 201, DATE '9999-12-31');

INSERT INTO ref_data_code_map (ref_data_code_map_pk, ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk, effective_to_date)
VALUES (302, 1, 102, 202, DATE '9999-12-31');

-- Feature graph for each existing test CPH
-- CPH 01/001/0001
INSERT INTO feature_involvement (feature_pk, cph,            feature_involvement_type, feature_involv_to_date)
VALUES                           (5001,      '01/001/0001',  'CPHHOLDERSHIP',          NULL);
INSERT INTO location            (feature_pk, location_id) VALUES (5001, 'LOC-ALPHA');
INSERT INTO feature_state       (feature_pk, feature_status_code) VALUES (5001, 'ACTIVE');

-- CPH 45/001/0002
INSERT INTO feature_involvement (feature_pk, cph,            feature_involvement_type, feature_involv_to_date)
VALUES                           (5002,      '45/001/0002',  'CPHHOLDERSHIP',          NULL);
INSERT INTO location            (feature_pk, location_id) VALUES (5002, 'LOC-BETA');
INSERT INTO feature_state       (feature_pk, feature_status_code) VALUES (5002, 'ACTIVE');

-- Negative control (should NOT be returned: inactive)
INSERT INTO v_cph_customer_unit (cph, cph_type) VALUES ('99/999/9999', 'INACTIVE_SAMPLE');
INSERT INTO feature_involvement (feature_pk, cph,            feature_involvement_type, feature_involv_to_date)
VALUES                           (5999,      '99/999/9999',  'CPHHOLDERSHIP',          NULL);
INSERT INTO location            (feature_pk, location_id) VALUES (5999, 'LOC-ZZ');
INSERT INTO feature_state       (feature_pk, feature_status_code) VALUES (5999, 'INACTIVE');
-- also wire a county/parish map so the joins succeed but the WHERE filters exclude it
INSERT INTO ref_data_code      (ref_data_code_pk, code,     effective_to_date) VALUES (1099, 'LA99999', DATE '9999-12-31');
INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description)           VALUES (1099, 'Control LA 99/999');
INSERT INTO ref_data_code      (ref_data_code_pk, code,     effective_to_date) VALUES (2099, '99/999', DATE '9999-12-31');
INSERT INTO ref_data_code_map  (ref_data_code_map_pk, ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk, effective_to_date)
VALUES (3099, 1, 1099, 2099, DATE '9999-12-31');

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW: CPH 01/409/1111 with TWO locations on the SAME feature (multi-location)
-- ─────────────────────────────────────────────────────────────────────────────

-- Ensure the CPH exists in the base table (surface via view AHBRP.CPH)
INSERT INTO v_cph_customer_unit (cph, cph_type) VALUES ('01/409/1111', 'MULTI_LOC_TEST');

-- Reference data so SUBSTR(cph,1,6) = '01/409' joins correctly
INSERT INTO ref_data_code      (ref_data_code_pk, code,     effective_to_date) VALUES (103, 'LA01409', DATE '9999-12-31');
INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description)           VALUES (103, 'Local Authority 01/409');
INSERT INTO ref_data_code      (ref_data_code_pk, code,     effective_to_date) VALUES (203, '01/409', DATE '9999-12-31');
INSERT INTO ref_data_code_map  (ref_data_code_map_pk, ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk, effective_to_date)
VALUES (303, 1, 103, 203, DATE '9999-12-31');

-- Single feature node for the CPH...
INSERT INTO feature_involvement (feature_pk, cph,            feature_involvement_type, feature_involv_to_date)
VALUES                           (6409,      '01/409/1111',  'CPHHOLDERSHIP',          NULL);

-- ...with TWO locations attached (this is the case we want to support/test)
INSERT INTO location (feature_pk, location_id) VALUES (6409, 'LOC-OMEGA');
INSERT INTO location (feature_pk, location_id) VALUES (6409, 'LOC-THETA');

-- Mark that feature ACTIVE
INSERT INTO feature_state (feature_pk, feature_status_code) VALUES (6409, 'ACTIVE');

COMMIT;

-- Helpful indexes (optional for local XE, but nice to have)
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_fi_cph           ON feature_involvement (cph)';          EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_fi_feature_pk    ON feature_involvement (feature_pk)';   EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_loc_feature_pk   ON location (feature_pk)';               EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_fs_feature_pk    ON feature_state (feature_pk)';          EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_rdc_code         ON ref_data_code (code)';                EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_rdcm_to_pk       ON ref_data_code_map (to_ref_data_code_pk)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_rdcm_from_pk     ON ref_data_code_map (from_ref_data_code_pk)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW: /locations endpoint structures (BS7666 + assets) + seed data
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop minimal tables if re-running locally (idempotent dev runs)
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

-- Helpful indexes for locations endpoint
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_fa_feature_pk ON feature_address (feature_pk)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_fa_address_pk ON feature_address (address_pk)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_al_feature_pk ON asset_location (feature_pk)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_al_asset_pk   ON asset_location (asset_pk)';   EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_ass_asset_pk  ON asset_state (asset_pk)';      EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ── Seed data for a fully-populated test location: L97339 ────────────────────
-- Choose ids that do not clash with earlier feature_pk/asset_pk/address_pk
-- Existing examples used 5001, 5002, 5999, 6409 -> we'll use 7000-range.

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

COMMIT;
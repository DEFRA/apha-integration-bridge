-- ─────────────────────────────────────────────────────────────────────────────
--  Local XE / Free init: create AHBRP objects for /locations and /holdings
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
-- Build everything in AHBRP without CONNECTing:
ALTER SESSION SET CURRENT_SCHEMA = AHBRP;

-- ─────────────────────────────────────────────────────────────────────────────
-- Base CPH structures used by /holdings (make self-contained)
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN EXECUTE IMMEDIATE 'DROP VIEW cph'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE v_cph_customer_unit PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
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

-- Keep both sets of test data intact (existing samples + those used by holdings)
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

-- Minimal rows referenced by holding tests
INSERT INTO v_cph_customer_unit (cph, cph_type) VALUES ('01/001/0001', 'UNIT_TEST');
INSERT INTO v_cph_customer_unit (cph, cph_type) VALUES ('45/001/0002', 'DEV_SAMPLE');
INSERT INTO v_cph_customer_unit (cph, cph_type) VALUES ('99/999/9999', 'INACTIVE_SAMPLE');

CREATE OR REPLACE VIEW cph (CPH, CPH_TYPE) AS
SELECT cph, cph_type
FROM   v_cph_customer_unit;

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
BEGIN EXECUTE IMMEDIATE 'DROP TABLE feature_involvement PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
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

-- Minimal asset model used by the /locations API query
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

-- Feature / location graph (multi-location refactor)
CREATE TABLE feature_involvement (
  feature_pk                  NUMBER       PRIMARY KEY,
  cph                         VARCHAR2(50) NOT NULL,
  feature_involvement_type    VARCHAR2(50) NOT NULL,
  feature_involv_to_date      DATE
);

-- Composite PK so one feature can have multiple locations
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

-- Helpful indexes
CREATE INDEX idx_fa_feature_pk ON feature_address (feature_pk);
CREATE INDEX idx_fa_address_pk ON feature_address (address_pk);
CREATE INDEX idx_al_feature_pk ON asset_location (feature_pk);
CREATE INDEX idx_al_asset_pk   ON asset_location (asset_pk);
CREATE INDEX idx_ass_asset_pk  ON asset_state (asset_pk);
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_fi_cph        ON feature_involvement (cph)';         EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_fi_feature_pk ON feature_involvement (feature_pk)';  EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_loc_feature_pk ON location (feature_pk)';            EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_fs_feature_pk  ON feature_state (feature_pk)';       EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- Reference data used by the /holdings query (keep what main had)
-- ─────────────────────────────────────────────────────────────────────────────
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

BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_set_map (ref_data_set_map_pk, ref_data_set_map_name, effective_to_date)
VALUES (1, ''LOCAL_AUTHORITY_COUNTY_PARISH'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- rdc: local authority numbers + descriptions
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code      (ref_data_code_pk, code,     effective_to_date) VALUES (101, ''LA01001'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description)           VALUES (101, ''Local Authority 01/001'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code      (ref_data_code_pk, code,     effective_to_date) VALUES (102, ''LA45001'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description)           VALUES (102, ''Dev Sample LA 45/001'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- rdc1: county/parish codes (must equal SUBSTR(cph,1,6))
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code (ref_data_code_pk, code,     effective_to_date) VALUES (201, ''01/001'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code (ref_data_code_pk, code,     effective_to_date) VALUES (202, ''45/001'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- rdc -> rdc1 mapping
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_map (ref_data_code_map_pk, ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk, effective_to_date)
VALUES (301, 1, 101, 201, DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_map (ref_data_code_map_pk, ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk, effective_to_date)
VALUES (302, 1, 102, 202, DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- Negative control mapping (99/999)
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code      (ref_data_code_pk, code,     effective_to_date) VALUES (1099, ''LA99999'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description)           VALUES (1099, ''Control LA 99/999'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code      (ref_data_code_pk, code,     effective_to_date) VALUES (2099, ''99/999'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_map  (ref_data_code_map_pk, ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk, effective_to_date)
VALUES (3099, 1, 1099, 2099, DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- Additional mapping for multi-location CPH 01/409/1111
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code      (ref_data_code_pk, code,     effective_to_date) VALUES (103, ''LA01409'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description)           VALUES (103, ''Local Authority 01/409'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code      (ref_data_code_pk, code,     effective_to_date) VALUES (203, ''01/409'', DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'INSERT INTO ref_data_code_map  (ref_data_code_map_pk, ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk, effective_to_date)
VALUES (303, 1, 103, 203, DATE ''9999-12-31'')'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- Seeds for /locations endpoint (your branch) – keep intact
-- ─────────────────────────────────────────────────────────────────────────────

-- Clear any prior rows for these fixtures (idempotent)
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

-- Location L97339 with address + commodities + facility
INSERT INTO location (feature_pk, location_id) VALUES (7003, 'L97339');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm) VALUES (7003, 'ACTIVE', NULL);

INSERT INTO bs7666_address (
  address_pk, paon_start_number, paon_start_number_suffix, paon_end_number,
  paon_end_number_suffix, paon_description, saon_description, saon_start_number,
  saon_start_number_suffix, saon_end_number, saon_end_number_suffix, street,
  locality, town, administrative_area, postcode, uk_internal_code, country_code
) VALUES (
  9001, 12, NULL, NULL, NULL, 'Willow Barn', NULL, NULL, NULL, NULL, NULL,
  'Farm Lane', 'Westham', 'Exampletown', 'Devon', 'EX1 2AB', 'UKX123', 'GB'
);
INSERT INTO feature_address (feature_pk, address_pk, feature_address_to_date) VALUES (7003, 9001, NULL);

INSERT INTO livestock_unit (asset_pk, unit_id) VALUES (8001, 'U000010');
INSERT INTO asset_state    (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (8001, 'ACTIVE', NULL);
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date) VALUES (7003, 8001, 'PRIMARYLOCATION', NULL);

INSERT INTO livestock_unit (asset_pk, unit_id) VALUES (8002, 'U000020');
INSERT INTO asset_state    (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (8002, 'ACTIVE', NULL);
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date) VALUES (7003, 8002, 'PRIMARYLOCATION', NULL);

INSERT INTO facility     (asset_pk, unit_id) VALUES (8003, 'U000030');
INSERT INTO asset_state  (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (8003, 'ACTIVE', NULL);
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date) VALUES (7003, 8003, 'PRIMARYLOCATION', NULL);

-- Negatives: inactive + secondary location
INSERT INTO facility     (asset_pk, unit_id) VALUES (8004, 'U999999');
INSERT INTO asset_state  (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (8004, 'INACTIVE', NULL);
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date) VALUES (7003, 8004, 'PRIMARYLOCATION', NULL);

INSERT INTO livestock_unit (asset_pk, unit_id) VALUES (8005, 'U888888');
INSERT INTO asset_state    (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (8005, 'ACTIVE', NULL);
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date) VALUES (7003, 8005, 'SECONDARYLOCATION', NULL);

-- Address-only location (no commodities/facilities)
INSERT INTO location (feature_pk, location_id) VALUES (7004, 'LNOASSET');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm) VALUES (7004, 'ACTIVE', NULL);

INSERT INTO bs7666_address (
  address_pk, paon_start_number, paon_start_number_suffix, paon_end_number,
  paon_end_number_suffix, paon_description, saon_description, saon_start_number,
  saon_start_number_suffix, saon_end_number, saon_end_number_suffix, street,
  locality, town, administrative_area, postcode, uk_internal_code, country_code
) VALUES (
  9002, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  'No Asset Street', NULL, 'Nowhereville', 'Somerset', 'ZZ1 1ZZ', 'UKX999', 'GB'
);
INSERT INTO feature_address (feature_pk, address_pk, feature_address_to_date) VALUES (7004, 9002, NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seeds from main: feature graph for holdings + multi-location case
-- ─────────────────────────────────────────────────────────────────────────────
-- Features 5001, 5002 active; 5999 inactive control
INSERT INTO feature_involvement (feature_pk, cph,            feature_involvement_type, feature_involv_to_date) VALUES (5001, '01/001/0001', 'CPHHOLDERSHIP', NULL);
INSERT INTO location            (feature_pk, location_id) VALUES (5001, 'LOC-ALPHA');
INSERT INTO feature_state       (feature_pk, feature_status_code, feature_state_to_dttm) VALUES (5001, 'ACTIVE', NULL);

INSERT INTO feature_involvement (feature_pk, cph,            feature_involvement_type, feature_involv_to_date) VALUES (5002, '45/001/0002', 'CPHHOLDERSHIP', NULL);
INSERT INTO location            (feature_pk, location_id) VALUES (5002, 'LOC-BETA');
INSERT INTO feature_state       (feature_pk, feature_status_code, feature_state_to_dttm) VALUES (5002, 'ACTIVE', NULL);

INSERT INTO feature_involvement (feature_pk, cph,            feature_involvement_type, feature_involv_to_date) VALUES (5999, '99/999/9999', 'CPHHOLDERSHIP', NULL);
INSERT INTO location            (feature_pk, location_id) VALUES (5999, 'LOC-ZZ');
INSERT INTO feature_state       (feature_pk, feature_status_code, feature_state_to_dttm) VALUES (5999, 'INACTIVE', NULL);

-- NEW: CPH 01/409/1111 with TWO locations on the SAME feature (multi-location)
INSERT INTO v_cph_customer_unit (cph, cph_type) VALUES ('01/409/1111', 'MULTI_LOC_TEST');
INSERT INTO feature_involvement (feature_pk, cph,            feature_involvement_type, feature_involv_to_date) VALUES (6409, '01/409/1111', 'CPHHOLDERSHIP', NULL);
INSERT INTO location (feature_pk, location_id) VALUES (6409, 'LOC-OMEGA');
INSERT INTO location (feature_pk, location_id) VALUES (6409, 'LOC-THETA');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm) VALUES (6409, 'ACTIVE', NULL);

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants for test user "sam" (performed as SYS; CURRENT_SCHEMA already AHBRP)
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
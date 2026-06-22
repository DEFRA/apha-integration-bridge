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
  EXECUTE IMMEDIATE 'DROP TABLE v_cph_customer_unit CASCADE CONSTRAINTS PURGE';
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
BEGIN EXECUTE IMMEDIATE 'DROP TABLE feature_state CASCADE CONSTRAINTS PURGE';         EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE location CASCADE CONSTRAINTS PURGE';              EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE feature_involvement CASCADE CONSTRAINTS PURGE';   EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ref_data_code_map CASCADE CONSTRAINTS PURGE';  EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ref_data_code_desc CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ref_data_code CASCADE CONSTRAINTS PURGE';      EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ref_data_set_map CASCADE CONSTRAINTS PURGE';   EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ref_data_set CASCADE CONSTRAINTS PURGE';       EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ── Reference data tables — aligned to canonical SAM schema ──────────────────
-- New NOT NULL columns use DEFAULTs so the existing column-list INSERTs across
-- 001..006 need no per-row edits (defaults are query-neutral; the only filtered
-- column, EFFECTIVE_TO_DATE, stays explicitly seeded). FKs are added in
-- 009_add_foreign_keys.sql after all data loads (D9 refinement).
CREATE TABLE ref_data_set (
  ref_data_set_pk            NUMBER        NOT NULL,
  party_pk                   NUMBER,
  ref_data_set_name          VARCHAR2(100) NOT NULL,
  ref_data_set_desc          VARCHAR2(1000),
  data_type                  VARCHAR2(100) DEFAULT 'REFERENCE' NOT NULL,
  business_domain            VARCHAR2(100) DEFAULT 'REFERENCE' NOT NULL,
  is_ldssm_compliant_ind     CHAR(1)       DEFAULT 'N' NOT NULL,
  is_mastered_by_domain_ind  CHAR(1)       DEFAULT 'N' NOT NULL,
  effective_from_date        DATE          DEFAULT DATE '2000-01-01' NOT NULL,
  effective_to_date          DATE,
  CONSTRAINT pk_ref_data_set PRIMARY KEY (ref_data_set_pk),
  CONSTRAINT ck_rdse_is_ldssm_compliant CHECK (is_ldssm_compliant_ind IN ('Y', 'N')),
  CONSTRAINT ck_rdse_is_mastered_by_dom_ind CHECK (is_mastered_by_domain_ind IN ('Y', 'N'))
  -- real FK: party_pk -> ORGANISATION(party_pk) omitted (soft, nullable, query-unused; D2)
);
CREATE UNIQUE INDEX uk_rdse_ref_data_set_name ON ref_data_set (ref_data_set_name);

CREATE TABLE ref_data_code (
  ref_data_code_pk      NUMBER        NOT NULL,
  ref_data_set_pk       NUMBER        NOT NULL,
  code                  VARCHAR2(25)  NOT NULL,  -- real VARCHAR2(20); widened (D5: 'Disease Investigation'/'CATTLE_BREEDING_DAIRY' = 21)
  ref_data_subset_pk    NUMBER,
  effective_from_date   DATE          DEFAULT DATE '2000-01-01' NOT NULL,
  effective_to_date     DATE,
  CONSTRAINT pk_ref_data_code PRIMARY KEY (ref_data_code_pk)
  -- real FK: ref_data_subset_pk -> REF_DATA_SUBSET omitted (parent out of fixture scope; D2)
);
CREATE UNIQUE INDEX uk_rdco_ref_data_set_pk_code ON ref_data_code (ref_data_set_pk, code);

CREATE TABLE ref_data_code_desc (
  ref_data_code_pk      NUMBER        NOT NULL,
  language_code         VARCHAR2(20)  NOT NULL,
  short_description     VARCHAR2(100) NOT NULL,
  description           VARCHAR2(1000),
  sort_sequence         NUMBER,
  CONSTRAINT pk_ref_data_code_desc PRIMARY KEY (ref_data_code_pk, language_code)
);

-- ── Feature / location cluster — aligned to canonical SAM schema ─────────────
-- New NOT NULL cols use literal DEFAULTs; surrogate FEATURE_STATE_PK uses IDENTITY
-- (existing MERGE/INSERT producers unchanged). FKs added in 009.
-- party_role_pk is real NOT NULL: orphan location-display involvements (5001,5999)
-- that never gain a real holder role default to the past-dated SENTINEL role 0
-- (seeded below), so find-holding(s) still excludes them (PR.PARTY_ROLE_TO_DATE
-- IS NULL fails) while find-locations still shows their CPH (D8).
CREATE TABLE feature_involvement (
  feature_involvement_pk       NUMBER       GENERATED BY DEFAULT AS IDENTITY,
  feature_pk                   NUMBER       NOT NULL,
  party_role_pk                NUMBER       DEFAULT 0 NOT NULL,
  activity_class_party_role_pk NUMBER,
  document_pk                  NUMBER,
  feature_involvement_type     VARCHAR2(20) NOT NULL,
  feature_third_party_info_ind CHAR(1),
  feature_involv_from_date     DATE         DEFAULT DATE '2000-01-01' NOT NULL,
  feature_involv_to_date       DATE,
  ownership_last_checked_date  DATE,
  owner_of_place_status        VARCHAR2(20),
  cph                          VARCHAR2(50),  -- real CHAR(11); kept VARCHAR2 (D4) so short CPH ids match without blank-padding
  vetnet_core_id               NUMBER,
  temporary_cph_indicator      CHAR(1),
  CONSTRAINT pk_feature_involvement PRIMARY KEY (feature_involvement_pk),
  CONSTRAINT ck_finv_third_party_info_ind CHECK (feature_third_party_info_ind IN ('Y', 'N', '?')),
  CONSTRAINT ck_finv_temporary_cph_ind CHECK (temporary_cph_indicator IN ('Y', 'N', '?', 'T'))
  -- real FKs feature_pk->FEATURE, party_role_pk->PARTY_ROLE added in 009
  -- activity_class_party_role_pk->ACTIVITY_CLASS_PARTY_ROLE, document_pk->DOCUMENT,
  -- and (cph,vetnet_core_id)->CPH + ck_finv_type_cph_core_id omitted (out of scope / D4)
);
CREATE INDEX ix_finv_cph ON feature_involvement (cph, party_role_pk);
CREATE INDEX ix_finv_feature_pk_inv_type ON feature_involvement (feature_pk, feature_involvement_type);
CREATE INDEX ix_finv_vetnet_core_id ON feature_involvement (vetnet_core_id);
-- canonical 'functional' index reproduced as an ordinary composite index
CREATE INDEX ix_finv_func_core_id ON feature_involvement (vetnet_core_id, party_role_pk);

CREATE TABLE location (
  feature_pk             NUMBER       NOT NULL,
  location_id            VARCHAR2(20) NOT NULL,  -- real VARCHAR2(8); widened (D5: 'LOC-1111111111' = 14)
  common_land_indicator  CHAR(1),
  right_of_way_indicator CHAR(1),
  CONSTRAINT pk_location PRIMARY KEY (feature_pk),
  CONSTRAINT ck_loca_common_land_indicator CHECK (common_land_indicator IN ('Y', 'N', '?')),
  CONSTRAINT ck_loca_of_way_indicator CHECK (right_of_way_indicator IN ('Y', 'N', '?'))
  -- real FK: feature_pk -> FEATURE (added in 009)
);
CREATE UNIQUE INDEX uk_location_location_id ON location (location_id);

CREATE TABLE feature_state (
  feature_state_pk          NUMBER       GENERATED BY DEFAULT AS IDENTITY,
  feature_pk                NUMBER       NOT NULL,
  feature_status_code       VARCHAR2(20) NOT NULL,
  feature_state_reason_code VARCHAR2(20),
  feature_state_from_dttm   TIMESTAMP(3) DEFAULT TIMESTAMP '2000-01-01 00:00:00' NOT NULL,
  feature_state_to_dttm     TIMESTAMP(3),
  CONSTRAINT pk_feature_state PRIMARY KEY (feature_state_pk)
  -- real FK: feature_pk -> FEATURE (added in 009)
);

CREATE TABLE ref_data_set_map (
  ref_data_set_map_pk   NUMBER        NOT NULL,
  ref_data_set_map_name VARCHAR2(100) NOT NULL,
  ref_data_set_map_desc VARCHAR2(1000),
  ref_data_set_map_type VARCHAR2(20)  DEFAULT 'CE' NOT NULL,
  from_ref_data_set_pk  NUMBER        NOT NULL,
  to_ref_data_set_pk    NUMBER        NOT NULL,
  party_pk              NUMBER,
  effective_from_date   DATE          DEFAULT DATE '2000-01-01' NOT NULL,
  effective_to_date     DATE,
  CONSTRAINT pk_ref_data_set_map PRIMARY KEY (ref_data_set_map_pk),
  CONSTRAINT ck_rdsm_ref_data_set_map_type CHECK (ref_data_set_map_type IN ('PC', 'NW', 'CE', 'RR'))
  -- real FK: party_pk -> ORGANISATION(party_pk) omitted (soft, nullable, query-unused; D2)
);
CREATE UNIQUE INDEX uk_rdsm_ref_data_set_map_name ON ref_data_set_map (ref_data_set_map_name);

CREATE TABLE ref_data_code_map (
  ref_data_code_map_pk   NUMBER       NOT NULL,
  ref_data_set_map_pk    NUMBER       NOT NULL,
  from_ref_data_code_pk  NUMBER       NOT NULL,
  to_ref_data_code_pk    NUMBER       NOT NULL,
  is_primary_code_ind    CHAR(1),
  effective_from_date    DATE         DEFAULT DATE '2000-01-01' NOT NULL,
  effective_to_date      DATE,
  CONSTRAINT pk_ref_data_code_map PRIMARY KEY (ref_data_code_map_pk),
  CONSTRAINT ck_rdcm_is_prmry_cd_ind CHECK (is_primary_code_ind IN ('Y', 'N', '?'))
);
CREATE UNIQUE INDEX uk_rdcm_map_pk_from_pk_to_pk ON ref_data_code_map (ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk);

-- Minimal reference data to satisfy WHERE filters and joins.
-- from/to_ref_data_set_pk point at the LOCAL_AUTHORITY set (2000, created in 005).
-- The FK is validated in 009 after all data loads. Query-neutral (find-holding's
-- LOCAL_AUTHORITY CTE joins this map by NAME only).
INSERT INTO ref_data_set_map (ref_data_set_map_pk, ref_data_set_map_name, ref_data_set_map_type, from_ref_data_set_pk, to_ref_data_set_pk, effective_to_date)
VALUES (1, 'LOCAL_AUTHORITY_COUNTY_PARISH', 'CE', 2000, 2000, DATE '9999-12-31');

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
INSERT INTO ref_data_code      (ref_data_code_pk, code,     ref_data_set_pk, effective_to_date) VALUES (1099, 'LA99999', 2000, DATE '9999-12-31');
INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code)           VALUES (1099, 'Control LA 99/999', 'ENG');
INSERT INTO ref_data_code      (ref_data_code_pk, code,     ref_data_set_pk, effective_to_date) VALUES (2099, '99/999', 2000, DATE '9999-12-31');
INSERT INTO ref_data_code_map  (ref_data_code_map_pk, ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk, effective_to_date)
VALUES (3099, 1, 1099, 2099, DATE '9999-12-31');

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW: CPH 01/409/1111 with TWO locations via TWO features (schema-aligned)
-- ─────────────────────────────────────────────────────────────────────────────

-- Ensure the CPH exists in the base table (surface via view AHBRP.CPH)
INSERT INTO v_cph_customer_unit (cph, cph_type) VALUES ('01/409/1111', 'MULTI_LOC_TEST');

-- Reference data so SUBSTR(cph,1,6) = '01/409' joins correctly
INSERT INTO ref_data_code      (ref_data_code_pk, code,     ref_data_set_pk, effective_to_date) VALUES (103, 'LA01409', 2000, DATE '9999-12-31');
INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code)           VALUES (103, 'Local Authority 01/409', 'ENG');
INSERT INTO ref_data_code      (ref_data_code_pk, code,     ref_data_set_pk, effective_to_date) VALUES (203, '01/409', 2000, DATE '9999-12-31');
INSERT INTO ref_data_code_map  (ref_data_code_map_pk, ref_data_set_map_pk, from_ref_data_code_pk, to_ref_data_code_pk, effective_to_date)
VALUES (303, 1, 103, 203, DATE '9999-12-31');

-- Two feature nodes for the same CPH...
INSERT INTO feature_involvement (feature_pk, cph,            feature_involvement_type, feature_involv_to_date)
VALUES                           (6409,      '01/409/1111',  'CPHHOLDERSHIP',          NULL);
INSERT INTO feature_involvement (feature_pk, cph,            feature_involvement_type, feature_involv_to_date)
VALUES                           (6410,      '01/409/1111',  'CPHHOLDERSHIP',          NULL);

-- ...with one location attached to each feature
INSERT INTO location (feature_pk, location_id) VALUES (6409, 'LOC-OMEGA');
INSERT INTO location (feature_pk, location_id) VALUES (6410, 'LOC-THETA');

-- Mark both features ACTIVE
INSERT INTO feature_state (feature_pk, feature_status_code) VALUES (6409, 'ACTIVE');
INSERT INTO feature_state (feature_pk, feature_status_code) VALUES (6410, 'ACTIVE');

COMMIT;

-- Helpful indexes (optional for local XE, but nice to have).
-- (idx_fi_cph / idx_fi_feature_pk removed: redundant prefixes of the canonical
--  composite indexes ix_finv_cph / ix_finv_feature_pk_inv_type; idx_loc_feature_pk
--  removed: LOCATION's PK already indexes feature_pk.)
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_fs_feature_pk    ON feature_state (feature_pk)';          EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_rdc_code         ON ref_data_code (code)';                EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_rdcm_to_pk       ON ref_data_code_map (to_ref_data_code_pk)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_rdcm_from_pk     ON ref_data_code_map (from_ref_data_code_pk)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- COUNTY reference data set — maps ADMINISTRATIVE_AREA codes to descriptions
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN
  INSERT INTO ref_data_set (ref_data_set_pk, ref_data_set_name, effective_to_date)
  VALUES (6000, 'COUNTY', NULL);
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/

BEGIN
  INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date)
  VALUES (6001, 'Devon', 6000, DATE '9999-12-31');
  INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code)
  VALUES (6001, 'Devon', 'ENG');

  INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date)
  VALUES (6002, 'Somerset', 6000, DATE '9999-12-31');
  INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code)
  VALUES (6002, 'Somerset', 'ENG');

  INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date)
  VALUES (6003, 'Test County', 6000, DATE '9999-12-31');
  INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code)
  VALUES (6003, 'Test County', 'ENG');

  INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date)
  VALUES (6004, 'Shire', 6000, DATE '9999-12-31');
  INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code)
  VALUES (6004, 'Shire', 'ENG');

  INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date)
  VALUES (6005, 'County', 6000, DATE '9999-12-31');
  INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code)
  VALUES (6005, 'County', 'ENG');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW: /locations endpoint structures (BS7666 + assets) + seed data
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop all tables in correct order (reverse dependency order)
BEGIN EXECUTE IMMEDIATE 'DROP TABLE asset_location CASCADE CONSTRAINTS PURGE';          EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE asset_state CASCADE CONSTRAINTS PURGE';             EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE coll_regstrd_animal_group CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE asset CASCADE CONSTRAINTS PURGE';                   EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE facility_business_activty CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE facility_type CASCADE CONSTRAINTS PURGE';           EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE facility CASCADE CONSTRAINTS PURGE';                EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE animal_species CASCADE CONSTRAINTS PURGE';          EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE animal CASCADE CONSTRAINTS PURGE';                  EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE livestock_unit CASCADE CONSTRAINTS PURGE';          EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE feature_point CASCADE CONSTRAINTS PURGE';           EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE feature_address CASCADE CONSTRAINTS PURGE';         EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE bs7666_address CASCADE CONSTRAINTS PURGE';          EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE party_role CASCADE CONSTRAINTS PURGE';              EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE party_state CASCADE CONSTRAINTS PURGE';             EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE party CASCADE CONSTRAINTS PURGE';                   EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE feature CASCADE CONSTRAINTS PURGE';                EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- Animal tables for livestock species
CREATE TABLE animal_species (
  animal_species_pk            NUMBER       NOT NULL,
  animal_species_code          VARCHAR2(20),
  longevity_threshold          NUMBER,
  maximum_offspring            NUMBER,
  animal_species_from_date     DATE         DEFAULT DATE '2000-01-01' NOT NULL,
  animal_species_to_date       DATE,
  individual_rgstrtn_permitted CHAR(1),
  individual_animals_tracked   CHAR(1),
  CONSTRAINT pk_animal_species PRIMARY KEY (animal_species_pk),
  CONSTRAINT ck_aspe_rgstrtn_permitted CHECK (individual_rgstrtn_permitted IN ('Y', 'N', '?'))
);
CREATE UNIQUE INDEX uk_aspe_animal_species_code ON animal_species (animal_species_code);

CREATE TABLE animal (
  animal_pk                   NUMBER       NOT NULL,
  animal_species_pk           NUMBER       NOT NULL,
  breed_pk                    NUMBER,
  animal_type                 VARCHAR2(20) DEFAULT 'COLLECTION' NOT NULL,
  gender                      CHAR(1),
  registered_late_indicator   CHAR(1),
  animal_name                 VARCHAR2(35),
  plan_to_vaccinate_indicator CHAR(1),
  type_of_management          VARCHAR2(20),
  livestock_type              VARCHAR2(20),
  CONSTRAINT pk_animal PRIMARY KEY (animal_pk),
  CONSTRAINT ck_anim_vaccinate_indicator CHECK (plan_to_vaccinate_indicator IN ('Y', 'N', '?')),
  CONSTRAINT ck_anim_late_indicator CHECK (registered_late_indicator IN ('Y', 'N', '?'))
  -- real FK: animal_species_pk -> ANIMAL_SPECIES (009); breed_pk -> BREED omitted (out of scope, D2)
);

-- Facility tables for facility business activity
CREATE TABLE facility_type (
  facility_type_pk        NUMBER       NOT NULL,
  facility_type_code      VARCHAR2(20) NOT NULL,
  facility_type_from_date DATE         DEFAULT DATE '2000-01-01' NOT NULL,
  facility_type_to_date   DATE,
  CONSTRAINT pk_facility_type PRIMARY KEY (facility_type_pk)
);
CREATE UNIQUE INDEX uk_ftyp_facility_type_code ON facility_type (facility_type_code);

CREATE TABLE facility_business_activty (
  facility_business_activty_pk  NUMBER       NOT NULL,
  facility_type_pk              NUMBER       NOT NULL,
  facility_businss_actvty_code  VARCHAR2(25) NOT NULL,  -- real VARCHAR2(20); widened (D5: 'CATTLE_BREEDING_DAIRY' 21)
  tracing_priority              NUMBER       DEFAULT 0 NOT NULL,
  CONSTRAINT pk_facility_business_activty PRIMARY KEY (facility_business_activty_pk)
  -- real FK: facility_type_pk -> FACILITY_TYPE (added in 009)
);
CREATE UNIQUE INDEX uk_fbac_ftyp_pk_fbac_actvty_cd ON facility_business_activty (facility_type_pk, facility_businss_actvty_code);

-- ── Party cluster — aligned to canonical SAM schema ──────────────────────────
-- New NOT NULL columns use literal DEFAULTs; surrogate state PK uses IDENTITY
-- (the pattern the original fixture already uses for FEATURE_INVOLVEMENT), so the
-- existing party_state MERGE/INSERT producers need no per-row edits. FKs in 009.
CREATE TABLE party (
  party_pk                      NUMBER        NOT NULL,
  party_id                      VARCHAR2(20)  NOT NULL,  -- real VARCHAR2(8); widened (D5: 'CUST-...' up to 14)
  party_type                    VARCHAR2(20)  DEFAULT 'PERSON' NOT NULL,
  preferred_language_code       VARCHAR2(20),
  party_ah_memo                 VARCHAR2(4000),
  party_migrated_datetime       TIMESTAMP(3),
  party_mig_detail_check_ind    CHAR(1),
  party_data_last_check_dttm    TIMESTAMP(3),
  party_data_check_deferred_dt  DATE,
  password                      VARCHAR2(35),
  password_hint                 VARCHAR2(20),
  authentication_refused_ind    CHAR(1),
  secondary_contact_full_name   VARCHAR2(70),
  CONSTRAINT pk_party PRIMARY KEY (party_pk),
  CONSTRAINT ck_part_mig_detail_check_ind CHECK (party_mig_detail_check_ind IN ('Y', 'N', '?')),
  CONSTRAINT ck_part_refused_ind CHECK (authentication_refused_ind IN ('Y', 'N', '?'))
);
CREATE UNIQUE INDEX uk_party_id ON party (party_id);
CREATE INDEX ix_part_func_sec_contact ON party (secondary_contact_full_name, party_pk);

CREATE TABLE party_state (
  party_state_pk          NUMBER        GENERATED BY DEFAULT AS IDENTITY,
  party_pk                NUMBER        NOT NULL,
  party_status_code       VARCHAR2(20)  NOT NULL,
  party_state_reason_code VARCHAR2(20),
  party_state_from_dttm   TIMESTAMP(3)  DEFAULT TIMESTAMP '2000-01-01 00:00:00' NOT NULL,
  party_state_to_dttm     TIMESTAMP(3),
  CONSTRAINT pk_party_state PRIMARY KEY (party_state_pk)
);
CREATE UNIQUE INDEX uk_psta_party_party_state ON party_state (party_pk, party_state_pk);

CREATE TABLE party_role (
  party_role_pk         NUMBER        NOT NULL,
  party_pk              NUMBER        NOT NULL,
  role_pk               NUMBER        DEFAULT 0 NOT NULL,  -- real FK -> ROLE omitted (parent out of scope, D2); 0 sentinel
  main_role_type        VARCHAR2(20)  DEFAULT 'KEEPER' NOT NULL,
  party_role_from_date  DATE          DEFAULT DATE '2000-01-01' NOT NULL,
  party_role_to_date    DATE,
  CONSTRAINT pk_party_role PRIMARY KEY (party_role_pk)
);
CREATE INDEX ix_prol_party_role_party ON party_role (party_role_pk, party_pk);
CREATE INDEX ix_prol_role_pk_main_role_type ON party_role (role_pk, main_role_type);

-- Feature table for feature names
CREATE TABLE feature (
  feature_pk                   NUMBER        NOT NULL,
  document_pk                  NUMBER,
  feature_type                 VARCHAR2(20)  DEFAULT 'LOCATION' NOT NULL,
  feature_geometry             BLOB,
  shape_file_id                VARCHAR2(255),
  feature_name                 VARCHAR2(100),
  feature_description          VARCHAR2(255),
  feature_access_description   VARCHAR2(255),
  contiguous_area_indicator    CHAR(1),
  feature_area_band            VARCHAR2(20),
  feature_class_type           VARCHAR2(20),
  feature_migrated_datetime    TIMESTAMP(3),
  feature_mig_detail_check_ind CHAR(1),
  feature_data_last_check_dttm TIMESTAMP(3),
  feature_ah_memo              VARCHAR2(4000),
  feature_grouping_type        VARCHAR2(20),
  organisational_area_type     VARCHAR2(20),
  ftr_data_check_deferred_date DATE,
  CONSTRAINT pk_feature PRIMARY KEY (feature_pk),
  CONSTRAINT ck_feat_area_indicator CHECK (contiguous_area_indicator IN ('Y', 'N', '?')),
  CONSTRAINT ck_feat_mig_detail_check_ind CHECK (feature_mig_detail_check_ind IN ('Y', 'N', '?'))
  -- real FK: document_pk -> DOCUMENT omitted (out of scope, D2)
);

-- Feature point table for OS map references
CREATE TABLE feature_point (
  feature_point_pk          NUMBER       GENERATED BY DEFAULT AS IDENTITY,
  feature_pk                NUMBER       NOT NULL,
  feature_point_type        VARCHAR2(20) DEFAULT 'POINT' NOT NULL,
  os_map_reference          VARCHAR2(12),
  easting                   NUMBER(6, 0),
  northing                  NUMBER(7, 0),
  primary_feature_point_ind CHAR(1)      NOT NULL,
  feature_point_from_date   DATE         DEFAULT DATE '2000-01-01' NOT NULL,
  feature_point_to_date     DATE,
  CONSTRAINT pk_feature_point PRIMARY KEY (feature_point_pk),
  CONSTRAINT ck_fpoi_feature_point_ind CHECK (primary_feature_point_ind IN ('Y', 'N'))
  -- real FK: feature_pk -> FEATURE (added in 009)
);
CREATE INDEX ix_fpoi_os_map_referfence ON feature_point (os_map_reference);
-- canonical 'functional' index reproduced as an ordinary composite index
CREATE INDEX ix_fpoi_func_os_map_ref ON feature_point (os_map_reference, feature_pk);
CREATE INDEX ix_fpoi_easting ON feature_point (easting, feature_pk);
CREATE INDEX ix_fpoi_northing ON feature_point (northing, feature_pk);

-- Asset table linking to animals
CREATE TABLE asset (
  asset_pk                     NUMBER       NOT NULL,
  animal_pk                    NUMBER,
  asset_type                   VARCHAR2(20) DEFAULT 'LIVESTOCKUNIT' NOT NULL,  -- query-neutral (queries test ASSET_PK IS NULL only)
  asset_migrated_datetime      TIMESTAMP(3),
  asset_mig_detail_check_ind   CHAR(1),
  asset_data_last_check_dttm   TIMESTAMP(3),
  asset_ah_memo                VARCHAR2(4000),
  unit_type                    VARCHAR2(20),
  asset_data_check_deferred_dt DATE,
  CONSTRAINT pk_asset PRIMARY KEY (asset_pk),
  CONSTRAINT ck_asse_mig_detail_check_ind CHECK (asset_mig_detail_check_ind IN ('Y', 'N', '?'))
  -- real FK: animal_pk -> ANIMAL (added in 009)
);
CREATE UNIQUE INDEX uk_asse_animal_pk ON asset (animal_pk);

CREATE TABLE coll_regstrd_animal_group (
  animal_pk                 NUMBER NOT NULL,
  usual_quantity_of_animals NUMBER,
  CONSTRAINT pk_coll_regstrd_animal_group PRIMARY KEY (animal_pk)
  -- real FK: animal_pk -> ANIMAL (added in 009)
);

-- Core BS7666 address tables
CREATE TABLE bs7666_address (
  address_pk                   NUMBER        NOT NULL,
  street                       VARCHAR2(100),
  locality                     VARCHAR2(35),
  town                         VARCHAR2(30),
  administrative_area          VARCHAR2(30),
  postcode                     VARCHAR2(8),
  country_code                 VARCHAR2(20),
  uk_internal_code             VARCHAR2(20),
  saon_start_number            NUMBER(4, 0),
  saon_start_number_suffix     CHAR(1),
  saon_end_number              NUMBER(4, 0),
  saon_end_number_suffix       CHAR(1),
  saon_description             VARCHAR2(90),
  paon_start_number            NUMBER(4, 0),
  paon_start_number_suffix     CHAR(1),
  paon_end_number              NUMBER(4, 0),
  paon_end_number_suffix       CHAR(1),
  paon_description             VARCHAR2(90),
  CONSTRAINT pk_bs7666_address PRIMARY KEY (address_pk)
);
CREATE INDEX ix_badd_func_postcode ON bs7666_address (postcode, address_pk);
CREATE INDEX ix_badd_func_street ON bs7666_address (street, address_pk);
CREATE INDEX ix_badd_func_town ON bs7666_address (town, address_pk);

CREATE TABLE feature_address (
  feature_address_pk      NUMBER GENERATED BY DEFAULT AS IDENTITY,
  feature_pk              NUMBER NOT NULL,
  address_pk              NUMBER NOT NULL,
  feature_address_from_date DATE DEFAULT DATE '2000-01-01' NOT NULL,
  feature_address_to_date DATE,
  CONSTRAINT pk_feature_address PRIMARY KEY (feature_address_pk)
  -- real FKs feature_pk -> FEATURE, address_pk -> ADDRESS added in 009
);

CREATE TABLE asset_location (
  asset_location_pk           NUMBER       GENERATED BY DEFAULT AS IDENTITY,
  feature_pk                  NUMBER       NOT NULL,
  asset_pk                    NUMBER       NOT NULL,
  temp_cph_pk                 NUMBER,
  asset_location_type         VARCHAR2(20) NOT NULL,  -- e.g. 'PRIMARYLOCATION'
  asset_location_plan_to_date DATE,
  animal_stay_headcount       VARCHAR2(8),
  information_source          VARCHAR2(20),
  data_derivation             VARCHAR2(20),
  asset_location_from_date    DATE         DEFAULT DATE '2000-01-01' NOT NULL,
  asset_location_to_date      DATE,
  information_last_check_date DATE,
  CONSTRAINT pk_asset_location PRIMARY KEY (asset_location_pk)
  -- real FKs feature_pk -> FEATURE, asset_pk -> ASSET added in 009
  -- temp_cph_pk -> TEMP_CPH omitted (out of scope, D2)
);
CREATE INDEX ix_aloc_asset_feature_loc_type ON asset_location (asset_pk, feature_pk, asset_location_type);

CREATE TABLE livestock_unit (
  asset_pk                   NUMBER       NOT NULL,
  regular_importer_indicator CHAR(1)      DEFAULT 'N' NOT NULL,
  unit_id                    VARCHAR2(20) NOT NULL,  -- real VARCHAR2(8); widened (D5: 'LU98001001' 10)
  CONSTRAINT pk_livestock_unit PRIMARY KEY (asset_pk),
  CONSTRAINT ck_luni_importer_indicator CHECK (regular_importer_indicator IN ('Y', 'N'))
  -- real FK: asset_pk -> ASSET (added in 009)
);
CREATE UNIQUE INDEX uk_livestock_unit_unit_id ON livestock_unit (unit_id);

CREATE TABLE facility (
  asset_pk                     NUMBER       NOT NULL,
  facility_sub_bsnss_actvty_pk NUMBER,
  facility_name                VARCHAR2(100),  -- real NOT NULL; kept NULLABLE (D13) so seeded name-less facility 8003 yields 'N/A'
  facility_business_activty_pk NUMBER,
  unit_id                      VARCHAR2(20) NOT NULL,  -- real VARCHAR2(8); widened (D5: 'F98001001' 9)
  CONSTRAINT pk_facility PRIMARY KEY (asset_pk)
  -- real FKs asset_pk -> ASSET, facility_business_activty_pk -> FACILITY_BUSINESS_ACTIVTY added in 009
  -- facility_sub_bsnss_actvty_pk -> FACILITY_SUB_BSNSS_ACTVTY omitted (out of scope, D2)
);
CREATE UNIQUE INDEX uk_facility_unit_id ON facility (unit_id);

CREATE TABLE asset_state (
  asset_state_pk          NUMBER       GENERATED BY DEFAULT AS IDENTITY,
  asset_pk                NUMBER       NOT NULL,
  asset_status_code       VARCHAR2(20) NOT NULL,  -- e.g. 'ACTIVE'
  asset_state_reason_code VARCHAR2(20),
  asset_state_from_dttm   TIMESTAMP(3) DEFAULT TIMESTAMP '2000-01-01 00:00:00' NOT NULL,
  asset_state_to_dttm     TIMESTAMP(3),
  CONSTRAINT pk_asset_state PRIMARY KEY (asset_state_pk)
  -- real FK: asset_pk -> ASSET (added in 009)
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
-- Existing examples used 5001, 5002, 5999, 6409, 6410 -> we'll use 7000-range.

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

-- ── Parent rows for referential integrity (D10 / D8) ─────────────────────────
-- FEATURE parent for every feature_pk used in 001 by LOCATION / FEATURE_STATE /
-- FEATURE_INVOLVEMENT / FEATURE_ADDRESS / FEATURE_POINT / ASSET_LOCATION
-- (91001/91002 are created in 005; 7432 in 002; 81111/82222/83333 in 003).
-- Required by the * -> FEATURE FKs added in 009. FEATURE_TYPE defaults to 'LOCATION'.
INSERT INTO feature (feature_pk) VALUES (5001);
INSERT INTO feature (feature_pk) VALUES (5002);
INSERT INTO feature (feature_pk) VALUES (5999);
INSERT INTO feature (feature_pk) VALUES (6409);
INSERT INTO feature (feature_pk) VALUES (6410);
INSERT INTO feature (feature_pk) VALUES (7003);
INSERT INTO feature (feature_pk) VALUES (7004);

-- ASSET parent for every asset_pk used in 001 by ASSET_LOCATION / ASSET_STATE /
-- LIVESTOCK_UNIT / FACILITY. ANIMAL_PK is NULL so the LU_SPECIES join yields no
-- species and find-locations/get-location report species 'N/A' for L97339 (D10).
-- Required by the * -> ASSET FKs added in 009.
INSERT INTO asset (asset_pk) VALUES (8001);
INSERT INTO asset (asset_pk) VALUES (8002);
INSERT INTO asset (asset_pk) VALUES (8003);
INSERT INTO asset (asset_pk) VALUES (8004);
INSERT INTO asset (asset_pk) VALUES (8005);

-- Sentinel PARTY + past-dated PARTY_ROLE (pk 0) backing the feature_involvement
-- DEFAULT party_role_pk = 0 for orphan location-display involvements (5001, 5999).
-- PARTY_ROLE_TO_DATE non-NULL => find-holding(s) excludes them (D8); party_id
-- 'FIX-ORPHAN' never matches a find-customers bind.
INSERT INTO party (party_pk, party_id, party_type) VALUES (0, 'FIX-ORPHAN', 'PERSON');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date) VALUES (0, 0, DATE '2000-01-01');

COMMIT;

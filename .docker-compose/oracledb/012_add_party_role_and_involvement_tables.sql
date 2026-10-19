-- ─────────────────────────────────────────────────────────────────────────────
--  012_add_party_role_and_involvement_tables.sql
--  DSFAAP-2928: the ROLE and ASSET_INVOLVEMENT tables, the party-role,
--  owner-of-place and from-date columns that find-party-involvements.sql and
--  find-party-roles.sql read, the ROLE_TYPE reference set that decodes role
--  names, and one row for each case the queries must handle. Runs after 001
--  to 009, which recreate the party, role, involvement and asset-location
--  tables on every container start. The two feature_involvement columns that
--  011 also adds are guarded, so 011 and 012 work in either order.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- 1) Tables the local subset lacked, recreated on every start like 001's
BEGIN EXECUTE IMMEDIATE 'DROP TABLE role PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE asset_involvement PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
CREATE TABLE role (
  role_pk         NUMBER       PRIMARY KEY,
  main_role_type  VARCHAR2(20) NOT NULL,
  role_type       VARCHAR2(20) NOT NULL
);

CREATE TABLE asset_involvement (
  asset_involvement_pk         NUMBER       PRIMARY KEY,
  asset_pk                     NUMBER       NOT NULL,
  party_role_pk                NUMBER       NOT NULL,
  asset_involvement_type       VARCHAR2(20) NOT NULL,
  asset_involvement_from_date  DATE         NOT NULL,
  asset_involvement_to_date    DATE,
  ownership_status             VARCHAR2(20),
  keepership_status            VARCHAR2(20)
);

-- 2) Columns the real SAM schema has and the local subset lacked. SAM only
--    sets CPH on a holdership, so the local NOT NULL on it goes.
ALTER TABLE party_role ADD (role_pk NUMBER, main_role_type VARCHAR2(20), party_role_from_date DATE);
ALTER TABLE asset_location ADD (asset_location_from_date DATE);
ALTER TABLE feature_involvement ADD (owner_of_place_status VARCHAR2(20), ownership_last_checked_date DATE);
ALTER TABLE feature_involvement MODIFY (cph NULL);
BEGIN EXECUTE IMMEDIATE 'ALTER TABLE feature_involvement ADD (vetnet_core_id NUMBER)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'ALTER TABLE feature_involvement ADD (feature_involv_from_date DATE)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- 3) Roles, and the ROLE_TYPE reference set that decodes them. REGISTRANT has
--    no entry, so its role name is null.
INSERT INTO role (role_pk, main_role_type, role_type) VALUES (1, 'CUSTOMER', 'CPHHOLDER');
INSERT INTO role (role_pk, main_role_type, role_type) VALUES (2, 'CUSTOMER', 'LIVESTOCKKEEPER');
INSERT INTO role (role_pk, main_role_type, role_type) VALUES (3, 'CUSTOMER', 'LIVESTOCKOWNER');
INSERT INTO role (role_pk, main_role_type, role_type) VALUES (4, 'CUSTOMER', 'AGENT');
INSERT INTO role (role_pk, main_role_type, role_type) VALUES (5, 'CUSTOMER', 'REGISTRANT');

-- ref_data_set is the one reference table 001 does not recreate, so this
-- insert is guarded for the second start
BEGIN
  INSERT INTO ref_data_set (ref_data_set_pk, ref_data_set_name, effective_to_date) VALUES (2928, 'ROLE_TYPE', NULL);
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/
INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date) VALUES (292811, 'CPHHOLDER', 2928, DATE '9999-12-31');
INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date) VALUES (292812, 'LIVESTOCKKEEPER', 2928, DATE '9999-12-31');
INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date) VALUES (292813, 'LIVESTOCKOWNER', 2928, DATE '9999-12-31');
INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date) VALUES (292814, 'AGENT', 2928, DATE '9999-12-31');
INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code) VALUES (292811, 'CPH Holder', 'ENG');
INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code) VALUES (292812, 'Livestock Keeper', 'ENG');
INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code) VALUES (292813, 'Livestock Owner', 'ENG');
INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code) VALUES (292814, 'Agent', 'ENG');

-- 4) Backfill the seeded rows: every existing party role is a CPH Holder role,
--    and roles, holderships and unit locations all began in 2008
UPDATE party_role SET role_pk = 1, main_role_type = 'CUSTOMER', party_role_from_date = DATE '2008-01-01' WHERE role_pk IS NULL;
UPDATE asset_location SET asset_location_from_date = DATE '2008-01-01' WHERE asset_location_from_date IS NULL;
UPDATE feature_involvement SET feature_involv_from_date = DATE '2008-01-01' WHERE feature_involv_from_date IS NULL;
UPDATE feature_involvement SET vetnet_core_id = 1 WHERE vetnet_core_id IS NULL AND feature_involvement_type = 'CPHHOLDERSHIP';

-- 5) Party types for the parties the tests read. party_version persists
--    between starts, so these are idempotent.
BEGIN INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (50111, 'PERSON', DATE '9999-12-31'); EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/
BEGIN INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (50222, 'ORGANISATION', DATE '9999-12-31'); EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/
BEGIN INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (94001, 'PERSON', DATE '9999-12-31'); EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/
BEGIN INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (29281, 'ORGANISATION', DATE '9999-12-31'); EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/
BEGIN INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (29282, 'PERSON', DATE '9999-12-31'); EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/

-- 6) An agent organisation that is the owner of place of 11/111/1111's location
--    (feature 81111), with a future end date the current-row window must keep
INSERT INTO party (party_pk, party_id) VALUES (29281, 'CUST-AGENT01');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (29281, 'ACTIVE', NULL);
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (2928101, 29281, NULL, 4, 'CUSTOMER', DATE '2015-01-01');
INSERT INTO feature_involvement (feature_pk, cph, feature_involvement_type, feature_involv_to_date, party_role_pk, feature_involv_from_date, owner_of_place_status, ownership_last_checked_date)
VALUES (81111, NULL, 'OWNEROFLOCATION', DATE '2099-12-31', 2928101, DATE '2015-01-01', 'UNCONFIRMED', DATE '2023-05-01');

-- 7) Keepers and owners of LU98001001 (asset 93001 at feature 91001, L98001).
--    Its holder CUST-98001 (party 94001) is also primary keeper and owner, so
--    one party has three involvements; the owner row fills both status
--    columns, so the query must pick the one for its type. A second person is
--    secondary keeper, was primary keeper until 2010 (ended), and holds an
--    ended CPH Holder role and an undecodable REGISTRANT role. CUST-98001 also
--    owns the facility at the same location, which the query must ignore.
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (94001002, 94001, NULL, 2, 'CUSTOMER', DATE '2010-06-01');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (94001003, 94001, NULL, 3, 'CUSTOMER', DATE '2010-06-01');

INSERT INTO party (party_pk, party_id) VALUES (29282, 'CUST-KEEPER02');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (29282, 'ACTIVE', NULL);
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (2928201, 29282, NULL, 2, 'CUSTOMER', DATE '2018-03-01');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (2928202, 29282, DATE '2020-01-01', 1, 'CUSTOMER', DATE '2012-01-01');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (2928203, 29282, NULL, 5, 'CUSTOMER', DATE '2019-01-01');

INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date, asset_involvement_to_date, ownership_status, keepership_status)
VALUES (292821, 93001, 94001002, 'PRIMARYKEEPEROF', DATE '2010-06-01', NULL, NULL, 'ACTIVE');
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date, asset_involvement_to_date, ownership_status, keepership_status)
VALUES (292822, 93001, 94001003, 'OWNEROF', DATE '2010-06-01', NULL, 'CONFIRMED', 'ACTIVE');
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date, asset_involvement_to_date, ownership_status, keepership_status)
VALUES (292823, 93001, 2928201, 'SECONDARYKEEPEROF', DATE '2018-03-01', NULL, NULL, 'UNCONFIRMED');
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date, asset_involvement_to_date, ownership_status, keepership_status)
VALUES (292824, 93001, 2928201, 'PRIMARYKEEPEROF', DATE '2008-01-01', DATE '2010-06-01', NULL, 'INACTIVE');
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date, asset_involvement_to_date, ownership_status, keepership_status)
VALUES (292825, 93002, 94001003, 'OWNEROF', DATE '2010-06-01', NULL, 'CONFIRMED', NULL);

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
--  014_add_organisation_type_column.sql
--  DSFAAP-2930: the ORGANISATION_TYPE column that
--  find-organisation-attributes.sql reads, and one organisation for each case
--  the query must handle. organisation and party_version persist between
--  container starts (004 creates them once and reseeds only its own rows), so
--  the column is guarded and the rows here, keyed 2930xx, are deleted before
--  they are inserted. party and party_state are recreated by 001 on every
--  start.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- 1) The column the real SAM schema has and the local subset lacked
--    (ignore the error when it already exists)
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE organisation ADD (organisation_type VARCHAR2(20))';
EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- 2) Backfill the organisations 004 reseeds on every start: SAM types nearly
--    every organisation NOTKNOWN
UPDATE organisation SET organisation_type = 'NOTKNOWN' WHERE organisation_type IS NULL;

-- 3) This script's own rows in the tables that persist, so a restart reseeds
--    them cleanly
DELETE FROM organisation WHERE party_pk BETWEEN 293000 AND 293099;
DELETE FROM party_version WHERE party_pk BETWEEN 293000 AND 293099;

-- 4) CUST-2930A (party 293001): an ordinary organisation, typed NOTKNOWN
INSERT INTO party (party_pk, party_id) VALUES (293001, 'CUST-2930A');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (293001, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (293001, 'ORGANISATION', DATE '9999-12-31');
INSERT INTO organisation (party_pk, organisation_name, primary_contact_full_name, organisation_type)
VALUES (293001, 'Hartley Poultry Ltd', 'R Hartley', 'NOTKNOWN');

-- 5) ACAR2930 (party 293002): one of Defra's own organisational units, which
--    SAM types AHORGUNIT and gives an A-prefixed id; the query returns it
--    like any other organisation
INSERT INTO party (party_pk, party_id) VALUES (293002, 'ACAR2930');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (293002, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (293002, 'ORGANISATION', DATE '9999-12-31');
INSERT INTO organisation (party_pk, organisation_name, primary_contact_full_name, organisation_type)
VALUES (293002, 'APHA Carlisle Office', NULL, 'AHORGUNIT');

-- 6) CUST-2930C (party 293003): an organisation whose only version has ended,
--    so it is no longer an organisation party and the query skips it
INSERT INTO party (party_pk, party_id) VALUES (293003, 'CUST-2930C');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (293003, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (293003, 'ORGANISATION', DATE '2020-01-01');
INSERT INTO organisation (party_pk, organisation_name, primary_contact_full_name, organisation_type)
VALUES (293003, 'Former Trading Co', NULL, 'NOTKNOWN');

COMMIT;

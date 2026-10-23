-- ─────────────────────────────────────────────────────────────────────────────
--  017_add_location_status_scenarios.sql
--  DSFAAP-2983: a location's status is its current state that is not
--  INACTIVE, the latest, then the one with the highest SAM key. SAM does not
--  enforce one current state per feature. The local table was keyed by
--  FEATURE_PK, so it could hold only one; SAM keys it by FEATURE_STATE_PK.
--  This drops that key, adds FEATURE_STATE_PK, which find-locations.sql
--  orders by, and adds two locations with two current states each: L298360's
--  start at different times, and L298370's at the same time.
--  Runs after 001 to 016. Every row is keyed 2983xx and deleted before it is
--  inserted, so the script can also be loaded by hand into a running
--  container.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE feature_state DROP PRIMARY KEY';
EXCEPTION WHEN OTHERS THEN NULL; END;
/

BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE feature_state ADD (feature_state_pk NUMBER)';
EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- 1) This script's own rows
DELETE FROM feature_state WHERE feature_pk IN (298360, 298370);
DELETE FROM location WHERE feature_pk IN (298360, 298370);
DELETE FROM feature WHERE feature_pk IN (298360, 298370);

-- 2) L298360: COMPLETE since 2016 and PARTIAL since 2020, so PARTIAL
INSERT INTO feature (feature_pk, feature_name) VALUES (298360, 'Two State Farm');
INSERT INTO location (feature_pk, location_id) VALUES (298360, 'L298360');
INSERT INTO feature_state (feature_state_pk, feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (298362, 298360, 'PARTIAL', NULL, NULL, TIMESTAMP '2020-01-01 09:00:00');
INSERT INTO feature_state (feature_state_pk, feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (298361, 298360, 'COMPLETE', NULL, NULL, TIMESTAMP '2016-01-01 09:00:00');

-- 3) L298370: COMPLETE and MIGRATED from the same moment, so MIGRATED, the
--    higher key
INSERT INTO feature (feature_pk, feature_name) VALUES (298370, 'Same Moment Farm');
INSERT INTO location (feature_pk, location_id) VALUES (298370, 'L298370');
INSERT INTO feature_state (feature_state_pk, feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (298371, 298370, 'COMPLETE', NULL, NULL, TIMESTAMP '2008-01-31 00:00:00');
INSERT INTO feature_state (feature_state_pk, feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (298372, 298370, 'MIGRATED', NULL, 'VETNETDATAMIG', TIMESTAMP '2008-01-31 00:00:00');

COMMIT;

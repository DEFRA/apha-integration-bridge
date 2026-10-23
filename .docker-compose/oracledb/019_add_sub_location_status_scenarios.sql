-- ─────────────────────────────────────────────────────────────────────────────
--  019_add_sub_location_status_scenarios.sql
--  Sub-location status rule: a sub-location's status is its current state
--  that is not INACTIVE, the latest, then the one with the highest SAM key,
--  as a location's is, and a sub-location whose current states are all
--  INACTIVE is left out. SAM does not enforce one current state per feature.
--  The premises L298390 contains four sheds:
--    298391  PARTIAL since 2016 and COMPLETE since 2020, so COMPLETE;
--    298392  COMPLETE and MIGRATED from the same moment, so MIGRATED, the
--            higher key;
--    298393  COMPLETE since 2015 and INACTIVE since 2020, so COMPLETE;
--    298394  INACTIVE only, so left out.
--  Runs after 001 to 018; fixture 017 lets FEATURE_STATE hold several states
--  per feature. Every row is keyed 2983xx and deleted before it is inserted,
--  so the script can also be loaded by hand into a running container.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- 1) This script's own rows
DELETE FROM feature_relationship WHERE feature_relationship_pk BETWEEN 2983951 AND 2983954;
DELETE FROM sub_location WHERE feature_pk BETWEEN 298391 AND 298394;
DELETE FROM feature_state WHERE feature_pk BETWEEN 298390 AND 298394;
DELETE FROM location WHERE feature_pk = 298390;
DELETE FROM feature WHERE feature_pk BETWEEN 298390 AND 298394;

-- 2) The premises L298390
INSERT INTO feature (feature_pk, feature_name) VALUES (298390, 'Status Farm');
INSERT INTO location (feature_pk, location_id) VALUES (298390, 'L298390');
INSERT INTO feature_state (feature_state_pk, feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (2983901, 298390, 'COMPLETE', NULL, NULL, TIMESTAMP '2016-01-01 09:00:00');

-- 3) Its four sheds
INSERT INTO feature (feature_pk, feature_name) VALUES (298391, 'Two State Shed');
INSERT INTO feature (feature_pk, feature_name) VALUES (298392, 'Same Moment Shed');
INSERT INTO feature (feature_pk, feature_name) VALUES (298393, 'Closing Shed');
INSERT INTO feature (feature_pk, feature_name) VALUES (298394, 'Inactive Shed');

INSERT INTO sub_location (feature_pk, sub_location_type, usable_area, usual_stock_quantity, broiler_stockg_density_range)
SELECT feature_pk, 'BROILERSHED', NULL, NULL, NULL FROM feature WHERE feature_pk BETWEEN 298391 AND 298394;

INSERT INTO feature_relationship (feature_relationship_pk, first_feature_pk, second_feature_pk, feature_relationship_type, feature_relatn_from_date, feature_relatn_to_date)
SELECT 2983950 + feature_pk - 298390, 298390, feature_pk, 'CONTAINS', DATE '2016-01-01', NULL
FROM feature WHERE feature_pk BETWEEN 298391 AND 298394;

-- 4) Their states
INSERT INTO feature_state (feature_state_pk, feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (2983912, 298391, 'COMPLETE', NULL, NULL, TIMESTAMP '2020-01-01 09:00:00');
INSERT INTO feature_state (feature_state_pk, feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (2983911, 298391, 'PARTIAL', NULL, NULL, TIMESTAMP '2016-01-01 09:00:00');

INSERT INTO feature_state (feature_state_pk, feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (2983921, 298392, 'COMPLETE', NULL, NULL, TIMESTAMP '2008-01-31 00:00:00');
INSERT INTO feature_state (feature_state_pk, feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (2983922, 298392, 'MIGRATED', NULL, 'VETNETDATAMIG', TIMESTAMP '2008-01-31 00:00:00');

INSERT INTO feature_state (feature_state_pk, feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (2983931, 298393, 'COMPLETE', NULL, NULL, TIMESTAMP '2015-01-01 09:00:00');
INSERT INTO feature_state (feature_state_pk, feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (2983932, 298393, 'INACTIVE', NULL, NULL, TIMESTAMP '2020-01-01 09:00:00');

INSERT INTO feature_state (feature_state_pk, feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (2983941, 298394, 'INACTIVE', NULL, NULL, TIMESTAMP '2020-01-01 09:00:00');

COMMIT;

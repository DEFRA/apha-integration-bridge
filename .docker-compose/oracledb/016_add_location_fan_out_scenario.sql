-- ─────────────────────────────────────────────────────────────────────────────
--  016_add_location_fan_out_scenario.sql
--  Location query fan-out: L298300, a location with 3 current addresses, 20
--  livestock units and 20 CPH holderships, so a test can count the rows
--  find-locations.sql and get-location.sql return for it. Joined as one flat
--  product they would return 2 × 3 × 20 × 20 = 2,400 rows; as a sum, 43.
--  Runs after 001 to 015. Every row is keyed 2983xx and deleted before it is
--  inserted, so the script can also be loaded by hand into a running
--  container.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- 1) This script's own rows
DELETE FROM feature_involvement WHERE feature_involvement_pk BETWEEN 298300 AND 298399;
DELETE FROM asset_location WHERE asset_pk BETWEEN 298300 AND 298399;
DELETE FROM asset_state WHERE asset_pk BETWEEN 298300 AND 298399;
DELETE FROM livestock_unit WHERE asset_pk BETWEEN 298300 AND 298399;
DELETE FROM asset WHERE asset_pk BETWEEN 298300 AND 298399;
DELETE FROM feature_address WHERE feature_address_pk BETWEEN 298300 AND 298399;
DELETE FROM bs7666_address WHERE address_pk BETWEEN 298300 AND 298399;
DELETE FROM address WHERE address_pk BETWEEN 298300 AND 298399;
DELETE FROM feature_point WHERE feature_point_pk BETWEEN 298300 AND 298399;
DELETE FROM feature_state WHERE feature_pk = 298300;
DELETE FROM location WHERE feature_pk = 298300;
DELETE FROM feature WHERE feature_pk = 298300;

-- 2) L298300, current, with a position
INSERT INTO feature (feature_pk, feature_name) VALUES (298300, 'Fan Out Farm');
INSERT INTO location (feature_pk, location_id) VALUES (298300, 'L298300');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (298300, 'COMPLETE', NULL, NULL, TIMESTAMP '2016-01-01 09:00:00');
INSERT INTO feature_point (feature_pk, primary_feature_point_ind, feature_point_to_date, os_map_reference,
                           feature_point_pk, feature_point_type, easting, northing, feature_point_from_date)
VALUES (298300, 'Y', NULL, 'SK3600036400', 298300, 'ACCESSPOINT', 436000, 336400, DATE '2016-01-01');

-- 3) Three current addresses: one postal, two not
INSERT INTO address (address_pk, address_from_date, address_to_date, non_postal_address_ind) VALUES (298301, DATE '2016-01-01', NULL, 'N');
INSERT INTO address (address_pk, address_from_date, address_to_date, non_postal_address_ind) VALUES (298302, DATE '2017-01-01', NULL, 'Y');
INSERT INTO address (address_pk, address_from_date, address_to_date, non_postal_address_ind) VALUES (298303, DATE '2018-01-01', NULL, 'Y');
INSERT INTO bs7666_address (address_pk, paon_description, street, town, postcode, uk_internal_code, country_code)
VALUES (298301, 'Fan Out Farm', 'Fan Lane', 'Exampleton', 'EX2 9FO', 'England', 'GB');
INSERT INTO bs7666_address (address_pk, paon_description, street, town, postcode)
VALUES (298302, 'Fan Out Yard', 'Fan Lane', 'Exampleton', 'EX2 9FY');
INSERT INTO bs7666_address (address_pk, paon_description, street, town, postcode)
VALUES (298303, 'Fan Out Field', 'Fan Lane', 'Exampleton', 'EX2 9FF');
INSERT INTO feature_address (feature_pk, address_pk, feature_address_to_date, feature_address_pk, feature_address_from_date)
VALUES (298300, 298301, NULL, 298301, DATE '2016-01-01');
INSERT INTO feature_address (feature_pk, address_pk, feature_address_to_date, feature_address_pk, feature_address_from_date)
VALUES (298300, 298302, NULL, 298302, DATE '2017-01-01');
INSERT INTO feature_address (feature_pk, address_pk, feature_address_to_date, feature_address_pk, feature_address_from_date)
VALUES (298300, 298303, NULL, 298303, DATE '2018-01-01');

-- 4) Twenty active livestock units, U298311 to U298330, whose primary
--    location is L298300
INSERT INTO asset (asset_pk, animal_pk)
SELECT 298310 + LEVEL, NULL FROM dual CONNECT BY LEVEL <= 20;
INSERT INTO livestock_unit (asset_pk, unit_id)
SELECT 298310 + LEVEL, 'U' || (298310 + LEVEL) FROM dual CONNECT BY LEVEL <= 20;
INSERT INTO asset_state (asset_pk, asset_status_code, asset_state_to_dttm)
SELECT 298310 + LEVEL, 'ACTIVE', NULL FROM dual CONNECT BY LEVEL <= 20;
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date, asset_location_from_date)
SELECT 298300, 298310 + LEVEL, 'PRIMARYLOCATION', NULL, DATE '2016-04-01' FROM dual CONNECT BY LEVEL <= 20;

-- 5) Twenty current holderships, 29/830/0001 to 29/830/0020
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, vetnet_core_id, feature_involv_from_date)
SELECT 298330 + LEVEL, 298300, '29/830/' || LPAD(LEVEL, 4, '0'), 'CPHHOLDERSHIP', NULL, NULL, LEVEL, DATE '2016-01-01'
FROM dual CONNECT BY LEVEL <= 20;

COMMIT;

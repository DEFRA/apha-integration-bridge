-- ─────────────────────────────────────────────────────────────────────────────
--  018_add_sub_location_position_and_address.sql
--  DSFAAP-2983: find-sub-locations.sql reads a sub-location's own point and
--  address, ranked as find-locations.sql ranks a location's. SAM's
--  development database holds neither for any sub-location, so these rows
--  are the only evidence. The broiler shed 97001 of L98001 (fixture 011) gets
--  two current primary points, of which the later is its position, and two
--  current addresses, of which the postal one is its address although the
--  other started later. The field 97002 keeps neither.
--  Runs after 001 to 017. Every row is keyed 2983xx and deleted before it is
--  inserted, so the script can also be loaded by hand into a running
--  container.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- 1) This script's own rows
DELETE FROM feature_point WHERE feature_point_pk BETWEEN 298381 AND 298382;
DELETE FROM feature_address WHERE feature_address_pk BETWEEN 298383 AND 298384;
DELETE FROM bs7666_address WHERE address_pk BETWEEN 298383 AND 298384;
DELETE FROM address WHERE address_pk BETWEEN 298383 AND 298384;

-- 2) Two current primary points for 97001: the 2018 one is its position
INSERT INTO feature_point (feature_pk, primary_feature_point_ind, feature_point_to_date, os_map_reference,
                           feature_point_pk, feature_point_type, easting, northing, feature_point_from_date)
VALUES (97001, 'Y', NULL, 'SK1231023410', 298381, 'BUILDING', 412310, 323410, DATE '2018-01-01');
INSERT INTO feature_point (feature_pk, primary_feature_point_ind, feature_point_to_date, os_map_reference,
                           feature_point_pk, feature_point_type, easting, northing, feature_point_from_date)
VALUES (97001, 'Y', NULL, 'SK1230023400', 298382, 'BUILDING', 412300, 323400, DATE '2015-03-01');

-- 3) Two current addresses for 97001: the postal one from 2015 is its
--    address, although the non-postal one started in 2019
INSERT INTO address (address_pk, address_from_date, address_to_date, non_postal_address_ind) VALUES (298383, DATE '2015-03-01', NULL, 'N');
INSERT INTO address (address_pk, address_from_date, address_to_date, non_postal_address_ind) VALUES (298384, DATE '2019-01-01', NULL, 'Y');
INSERT INTO bs7666_address (address_pk, paon_description, street, town, administrative_area, postcode, uk_internal_code, country_code)
VALUES (298383, 'Shed 1', 'Test Street', 'Test Town', 'TSTCTY', 'TE1 1SH', 'UK123', 'GB');
INSERT INTO bs7666_address (address_pk, paon_description, street, town, postcode)
VALUES (298384, 'Shed 1 Yard', 'Back Street', 'Test Town', 'TE1 1SY');
INSERT INTO feature_address (feature_pk, address_pk, feature_address_to_date, feature_address_pk, feature_address_from_date)
VALUES (97001, 298383, NULL, 298383, DATE '2015-03-01');
INSERT INTO feature_address (feature_pk, address_pk, feature_address_to_date, feature_address_pk, feature_address_from_date)
VALUES (97001, 298384, NULL, 298384, DATE '2019-01-01');

COMMIT;

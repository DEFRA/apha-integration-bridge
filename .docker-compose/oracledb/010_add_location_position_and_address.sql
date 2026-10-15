-- ─────────────────────────────────────────────────────────────────────────────
--  010_add_location_position_and_address.sql
--  DSFAAP-2927: the FEATURE_POINT, FEATURE_ADDRESS and ADDRESS columns that
--  find-locations.sql and get-location.sql select for a location's position
--  and address ranking, plus one row for each rule the queries apply.
--  Runs after 001 and 005, which recreate and seed the feature tables on every
--  container start. ADDRESS persists between starts, so its changes are
--  idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- 1) Columns the real SAM schema has and the local subset lacked
--    (ignore the error when a column already exists)
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE feature_point ADD (
    feature_point_pk        NUMBER,
    feature_point_type      VARCHAR2(20),
    easting                 NUMBER(6, 0),
    northing                NUMBER(7, 0),
    feature_point_from_date DATE
  )';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE feature_address ADD (
    feature_address_pk        NUMBER,
    feature_address_from_date DATE
  )';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE address ADD (non_postal_address_ind VARCHAR2(1))';
EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- 2) Backfill the points and address links seeded by 001 and 005: SAM always
--    stores them with a key and a from date
UPDATE feature_point
   SET feature_point_pk = 95002, feature_point_type = 'NOTKNOWN', feature_point_from_date = DATE '2008-01-01'
 WHERE feature_pk = 91001 AND feature_point_pk IS NULL;

UPDATE feature_point
   SET feature_point_pk = 95003, feature_point_type = 'NOTKNOWN', feature_point_from_date = DATE '2008-01-01'
 WHERE feature_pk = 91002 AND feature_point_pk IS NULL;

UPDATE feature_address
   SET feature_address_pk = CASE address_pk
                              WHEN 9001 THEN 96001
                              WHEN 9002 THEN 96002
                              WHEN 92001 THEN 96003
                              WHEN 92002 THEN 96004
                            END,
       feature_address_from_date = DATE '2008-01-01'
 WHERE feature_address_pk IS NULL
   AND address_pk IN (9001, 9002, 92001, 92002);

-- 3) ADDRESS rows for every seeded location address. N means postal, which
--    the queries rank first.
MERGE INTO address a
USING (
  SELECT 9001 address_pk, 'N' non_postal_address_ind FROM dual UNION ALL
  SELECT 9002, 'Y' FROM dual UNION ALL
  SELECT 9003, 'Y' FROM dual UNION ALL
  SELECT 9004, 'Y' FROM dual UNION ALL
  SELECT 92001, 'N' FROM dual UNION ALL
  SELECT 92002, 'N' FROM dual UNION ALL
  SELECT 92003, 'N' FROM dual
) src
ON (a.address_pk = src.address_pk)
WHEN NOT MATCHED THEN
  INSERT (address_pk, address_to_date, non_postal_address_ind)
  VALUES (src.address_pk, NULL, src.non_postal_address_ind);

-- 4) L97339 (feature 7003): its FEATURE row, so the queries return it, and two
--    more current addresses. Expected rank: 9001 first (postal), then 9003
--    (later from date), then 9004 (earlier from date despite the higher key).
BEGIN
  INSERT INTO feature (feature_pk, feature_name) VALUES (7003, 'Willow Barn Farm');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/
INSERT INTO bs7666_address (address_pk, street, town, postcode) VALUES (9003, 'Yard Lane', 'Exampletown', 'EX1 2AC');
INSERT INTO bs7666_address (address_pk, street, town, postcode) VALUES (9004, 'Back Lane', 'Exampletown', 'EX1 2AD');
INSERT INTO feature_address (feature_pk, address_pk, feature_address_to_date, feature_address_pk, feature_address_from_date)
VALUES (7003, 9003, NULL, 96006, DATE '2020-01-01');
INSERT INTO feature_address (feature_pk, address_pk, feature_address_to_date, feature_address_pk, feature_address_from_date)
VALUES (7003, 9004, NULL, 96007, DATE '2019-01-01');

-- 5) L98001 (feature 91001): a second current primary point, later but with
--    the lower key, so the latest point wins rather than the highest key
INSERT INTO feature_point (feature_pk, primary_feature_point_ind, feature_point_to_date, os_map_reference,
                           feature_point_pk, feature_point_type, easting, northing, feature_point_from_date)
VALUES (91001, 'Y', NULL, 'SK123456', 95001, 'CENTROID', 412345, 323456, DATE '2015-06-01');

-- 6) L98002 (feature 91002): an ended address link, which the queries ignore
INSERT INTO bs7666_address (address_pk, street, town, postcode) VALUES (92003, 'Old Farm Road', 'Bigtown', 'TE2 2ST');
INSERT INTO feature_address (feature_pk, address_pk, feature_address_to_date, feature_address_pk, feature_address_from_date)
VALUES (91002, 92003, DATE '2020-01-01', 96005, DATE '2010-01-01');

-- 7) L98003 (feature 91003): a point with a zero easting and a blank map
--    reference, and no address
BEGIN
  INSERT INTO feature (feature_pk, feature_name) VALUES (91003, 'Blank Point Farm');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/
BEGIN
  INSERT INTO location (feature_pk, location_id) VALUES (91003, 'L98003');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/
BEGIN
  INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm) VALUES (91003, 'ACTIVE', NULL);
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/
INSERT INTO feature_point (feature_pk, primary_feature_point_ind, feature_point_to_date, os_map_reference,
                           feature_point_pk, feature_point_type, easting, northing, feature_point_from_date)
VALUES (91003, 'Y', NULL, '   ', 95004, 'NOTKNOWN', 0, 123456, DATE '2008-01-01');

COMMIT;

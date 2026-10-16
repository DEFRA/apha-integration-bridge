-- ─────────────────────────────────────────────────────────────────────────────
--  011_add_holdership_and_sub_location_columns.sql
--  DSFAAP-2926: the CPH core id, holdership from date and feature-state columns
--  that find-holdings.sql now selects, the FEATURE_RELATIONSHIP and
--  SUB_LOCATION tables that find-sub-locations.sql reads, and one row for each
--  rule the queries apply. Runs after 001 to 005, which recreate the CPH,
--  involvement, state and feature tables on every container start, so the
--  ALTERs and inserts below never meet an earlier run of this script.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- 1) Columns the real SAM schema has and the local subset lacked
ALTER TABLE v_cph_customer_unit ADD (core_id NUMBER);
ALTER TABLE feature_involvement ADD (vetnet_core_id NUMBER, feature_involv_from_date DATE);
ALTER TABLE feature_state ADD (feature_state_reason_code VARCHAR2(20), feature_state_from_dttm TIMESTAMP(3));

-- The AHBRP.CPH view that 001 creates now exposes the core id, as the real
-- table does
CREATE OR REPLACE VIEW cph (CPH, CPH_TYPE, CORE_ID) AS
SELECT cph, cph_type, core_id
FROM   v_cph_customer_unit;

-- 2) Sub-location tables, recreated on every start like 001's tables
BEGIN EXECUTE IMMEDIATE 'DROP TABLE feature_relationship PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE sub_location PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
CREATE TABLE feature_relationship (
  feature_relationship_pk    NUMBER       PRIMARY KEY,
  first_feature_pk           NUMBER       NOT NULL,
  second_feature_pk          NUMBER       NOT NULL,
  feature_relationship_type  VARCHAR2(20) NOT NULL,
  feature_relatn_from_date   DATE         NOT NULL,
  feature_relatn_to_date     DATE
);

CREATE TABLE sub_location (
  feature_pk                    NUMBER       PRIMARY KEY,
  sub_location_type             VARCHAR2(20) NOT NULL,
  usable_area                   NUMBER,
  usual_stock_quantity          NUMBER,
  broiler_stockg_density_range  VARCHAR2(20)
);

-- 3) Backfill: every seeded holdership is core id 1 and started in 2008, with
--    a state that began the same day, as SAM guarantees
UPDATE v_cph_customer_unit SET core_id = 1 WHERE core_id IS NULL;

-- SAM keys a CPH row on the pair (CPH, CORE_ID); 001 keyed the local table on
-- the number alone, which would reject the second rows below
ALTER TABLE v_cph_customer_unit DROP CONSTRAINT v_cph_customer_unit_pk;
ALTER TABLE v_cph_customer_unit ADD CONSTRAINT v_cph_customer_unit_pk PRIMARY KEY (cph, core_id);
UPDATE feature_involvement SET vetnet_core_id = 1 WHERE vetnet_core_id IS NULL AND feature_involvement_type = 'CPHHOLDERSHIP';
UPDATE feature_involvement SET feature_involv_from_date = DATE '2008-01-01' WHERE feature_involv_from_date IS NULL;
UPDATE feature_state SET feature_state_from_dttm = TIMESTAMP '2008-01-01 00:00:00' WHERE feature_state_from_dttm IS NULL;

-- 22/222/2222 (feature 82222): a migrated location, so a reason code flows through
UPDATE feature_state SET feature_state_reason_code = 'VETNETDATAMIG' WHERE feature_pk = 82222;

-- 4) 01/409/1111, the one CPH the existing GET already answers with 409, carries
--    every multi-row case so no other fixture changes behaviour:
--    - its two features become two genuine holderships, core ids 1 and 2, the
--      second TEMPORARY;
--    - the core-2 holdership is stored twice, identical in every column;
--    - a third CPH row (EMERGENCY, core id 3) has no holdership of its own.
--    The pair-keyed query must return exactly the two holderships.
INSERT INTO v_cph_customer_unit (cph, cph_type, core_id) VALUES ('01/409/1111', 'TEMPORARY', 2);
INSERT INTO v_cph_customer_unit (cph, cph_type, core_id) VALUES ('01/409/1111', 'EMERGENCY', 3);
UPDATE feature_involvement SET vetnet_core_id = 2 WHERE feature_pk = 6410 AND cph = '01/409/1111';
INSERT INTO feature_involvement (feature_pk, cph, feature_involvement_type, feature_involv_to_date, party_role_pk, vetnet_core_id, feature_involv_from_date)
SELECT feature_pk, cph, feature_involvement_type, feature_involv_to_date, party_role_pk, vetnet_core_id, feature_involv_from_date
FROM feature_involvement
WHERE feature_pk = 6410 AND cph = '01/409/1111' AND feature_involvement_type = 'CPHHOLDERSHIP';

-- 5) Sub-locations of L98001 (feature 91001): a broiler shed with every
--    attribute, a migrated field with none, and an ended link the query must
--    ignore. L98002 (feature 91002) has none. The stored form of the broiler
--    density band is not yet known, so the value here is a placeholder.
INSERT INTO feature (feature_pk, feature_name) VALUES (97001, 'Shed 1');
INSERT INTO feature (feature_pk, feature_name) VALUES (97002, 'Top Field');
INSERT INTO feature (feature_pk, feature_name) VALUES (97003, 'Old Barn');

INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (97001, 'COMPLETE', NULL, NULL, TIMESTAMP '2015-03-01 00:00:00');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (97002, 'MIGRATED', NULL, 'VETNETDATAMIG', TIMESTAMP '2008-01-01 00:00:00');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (97003, 'COMPLETE', NULL, NULL, TIMESTAMP '2015-03-01 00:00:00');

INSERT INTO sub_location (feature_pk, sub_location_type, usable_area, usual_stock_quantity, broiler_stockg_density_range)
VALUES (97001, 'BROILERSHED', 1200, 30000, '33-39');
INSERT INTO sub_location (feature_pk, sub_location_type, usable_area, usual_stock_quantity, broiler_stockg_density_range)
VALUES (97002, 'FIELD', NULL, NULL, NULL);
INSERT INTO sub_location (feature_pk, sub_location_type, usable_area, usual_stock_quantity, broiler_stockg_density_range)
VALUES (97003, 'BARN', NULL, NULL, NULL);

INSERT INTO feature_relationship (feature_relationship_pk, first_feature_pk, second_feature_pk, feature_relationship_type, feature_relatn_from_date, feature_relatn_to_date)
VALUES (98001, 91001, 97001, 'CONTAINS', DATE '2015-03-01', NULL);
INSERT INTO feature_relationship (feature_relationship_pk, first_feature_pk, second_feature_pk, feature_relationship_type, feature_relatn_from_date, feature_relatn_to_date)
VALUES (98002, 91001, 97002, 'CONTAINS', DATE '2008-01-01', NULL);
INSERT INTO feature_relationship (feature_relationship_pk, first_feature_pk, second_feature_pk, feature_relationship_type, feature_relatn_from_date, feature_relatn_to_date)
VALUES (98003, 91001, 97003, 'CONTAINS', DATE '2015-03-01', DATE '2020-01-01');

COMMIT;

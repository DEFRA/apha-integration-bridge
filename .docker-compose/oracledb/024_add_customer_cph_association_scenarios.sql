-- ─────────────────────────────────────────────────────────────────────────────
--  024_add_customer_cph_association_scenarios.sql
--  DSFAAP-3187: CPH associations on POST /customers/find.
--  C3187001 is a holder, land owner and keeper; each of its other
--  involvements is excluded by one rule (see the comments below).
--  C3187002 holds the CPH C3187001 keeps at, C3187004 has no associations.
--  Rows are keyed 3187xx and deleted first, so the script can be rerun.
--  Runs after 015, which adds the LANDOWNER role.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- 1) This script's own rows
DELETE FROM party_contact_address WHERE party_contact_address_pk BETWEEN 31870000 AND 31879999;
DELETE FROM telecom_address WHERE telecom_address_pk BETWEEN 31870000 AND 31879999;
DELETE FROM asset_involvement WHERE asset_involvement_pk BETWEEN 318700 AND 318799;
DELETE FROM asset_location WHERE asset_pk BETWEEN 318700 AND 318799;
DELETE FROM asset_state WHERE asset_pk BETWEEN 318700 AND 318799;
DELETE FROM livestock_unit WHERE asset_pk BETWEEN 318700 AND 318799;
DELETE FROM asset WHERE asset_pk BETWEEN 318700 AND 318799;
DELETE FROM feature_involvement WHERE feature_involvement_pk BETWEEN 318700 AND 318799;
DELETE FROM v_cph_customer_unit WHERE cph LIKE '31/870/%';
DELETE FROM feature_state WHERE feature_pk BETWEEN 318700 AND 318799;
DELETE FROM location WHERE feature_pk BETWEEN 318700 AND 318799;
DELETE FROM feature WHERE feature_pk BETWEEN 318700 AND 318799;
DELETE FROM party_role WHERE party_role_pk BETWEEN 31870000 AND 31879999;
DELETE FROM role WHERE role_pk = 318701;
DELETE FROM person WHERE party_pk BETWEEN 318700 AND 318799;
DELETE FROM party_version WHERE party_pk BETWEEN 318700 AND 318799;
DELETE FROM party_state WHERE party_pk BETWEEN 318700 AND 318799;
DELETE FROM party WHERE party_pk BETWEEN 318700 AND 318799;

-- 2) A SAM role whose type has been retired
INSERT INTO role (role_pk, main_role_type, role_type, role_effective_to_date)
VALUES (318701, 'CUSTOMER', 'RETIREDHOLDER', DATE '2020-01-01');

-- 3) The parties: C3187001 and C3187002 share an e-mail address
INSERT INTO party (party_pk, party_id) VALUES (318701, 'C3187001');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (318701, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (318701, 'PERSON', DATE '9999-12-31');
INSERT INTO person (party_pk, person_title, person_given_name, person_given_name2, person_family_name)
VALUES (318701, 'MS', 'Gwen', NULL, 'Holder');

INSERT INTO party (party_pk, party_id) VALUES (318702, 'C3187002');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (318702, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (318702, 'PERSON', DATE '9999-12-31');
INSERT INTO person (party_pk, person_title, person_given_name, person_given_name2, person_family_name)
VALUES (318702, 'MR', 'Huw', NULL, 'Neighbour');

--    C3187003: an inactive person, the only holder of 31/870/0008
INSERT INTO party (party_pk, party_id) VALUES (318703, 'C3187003');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (318703, 'INACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (318703, 'PERSON', DATE '9999-12-31');
INSERT INTO person (party_pk, person_title, person_given_name, person_given_name2, person_family_name)
VALUES (318703, 'MR', 'Iwan', NULL, 'Gone');

--    C3187004: an active person with no roles, so no associations
INSERT INTO party (party_pk, party_id) VALUES (318704, 'C3187004');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (318704, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (318704, 'PERSON', DATE '9999-12-31');
INSERT INTO person (party_pk, person_title, person_given_name, person_given_name2, person_family_name)
VALUES (318704, 'MRS', 'Jan', NULL, 'Nobody');

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, internet_email_address)
VALUES (31870101, 'EMAIL', DATE '2020-01-01', NULL, 'cph.search@example.com');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (31870101, 318701, NULL, 31870101, NULL, DATE '2020-01-01', NULL);
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, internet_email_address)
VALUES (31870201, 'EMAIL', DATE '2020-01-01', NULL, 'cph.search@example.com');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (31870201, 318702, NULL, 31870201, NULL, DATE '2020-01-01', NULL);

-- 4) Party roles. Role 1 is CPHHOLDER, 2 LIVESTOCKKEEPER, 3 LIVESTOCKOWNER
--    (from 012) and 6 LANDOWNER (from 015)
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (31870101, 318701, NULL, 1, 'CUSTOMER', DATE '2015-01-01');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (31870102, 318701, NULL, 6, 'CUSTOMER', DATE '2015-01-01');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (31870103, 318701, NULL, 2, 'CUSTOMER', DATE '2015-01-01');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (31870104, 318701, NULL, 3, 'CUSTOMER', DATE '2015-01-01');
--    an ended CPHHOLDER role and an ended LIVESTOCKKEEPER role
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (31870105, 318701, DATE '2019-12-31', 1, 'CUSTOMER', DATE '2010-01-01');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (31870106, 318701, DATE '2019-12-31', 2, 'CUSTOMER', DATE '2010-01-01');
--    a current party role of the retired SAM role type
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (31870107, 318701, NULL, 318701, 'CUSTOMER', DATE '2010-01-01');

INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (31870201, 318702, NULL, 1, 'CUSTOMER', DATE '2016-01-01');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (31870301, 318703, NULL, 1, 'CUSTOMER', DATE '2016-01-01');

-- 5) Features. 318712 has no LOCATION row; 318713 is inactive
INSERT INTO feature (feature_pk, feature_name) VALUES (318710, 'Holder Farm');
INSERT INTO feature (feature_pk, feature_name) VALUES (318711, 'Holder Barn');
INSERT INTO feature (feature_pk, feature_name) VALUES (318712, 'Holder Yard');
INSERT INTO feature (feature_pk, feature_name) VALUES (318713, 'Closed Farm');
INSERT INTO feature (feature_pk, feature_name) VALUES (318714, 'Unheld Field');
INSERT INTO feature (feature_pk, feature_name) VALUES (318715, 'Neighbour Farm');
INSERT INTO feature (feature_pk, feature_name) VALUES (318716, 'Gone Farm');
INSERT INTO location (feature_pk, location_id) VALUES (318710, 'L3187010');
INSERT INTO location (feature_pk, location_id) VALUES (318711, 'L3187011');
INSERT INTO location (feature_pk, location_id) VALUES (318713, 'L3187013');
INSERT INTO location (feature_pk, location_id) VALUES (318714, 'L3187014');
INSERT INTO location (feature_pk, location_id) VALUES (318715, 'L3187015');
INSERT INTO location (feature_pk, location_id) VALUES (318716, 'L3187016');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm, feature_state_from_dttm)
VALUES (318710, 'COMPLETE', NULL, TIMESTAMP '2015-01-01 00:00:00');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm, feature_state_from_dttm)
VALUES (318711, 'COMPLETE', NULL, TIMESTAMP '2015-01-01 00:00:00');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm, feature_state_from_dttm)
VALUES (318712, 'COMPLETE', NULL, TIMESTAMP '2015-01-01 00:00:00');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm, feature_state_from_dttm)
VALUES (318713, 'INACTIVE', NULL, TIMESTAMP '2020-01-01 00:00:00');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm, feature_state_from_dttm)
VALUES (318714, 'COMPLETE', NULL, TIMESTAMP '2015-01-01 00:00:00');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm, feature_state_from_dttm)
VALUES (318715, 'COMPLETE', NULL, TIMESTAMP '2015-01-01 00:00:00');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm, feature_state_from_dttm)
VALUES (318716, 'COMPLETE', NULL, TIMESTAMP '2015-01-01 00:00:00');

-- 6) CPHs
INSERT INTO v_cph_customer_unit (cph, cph_type, core_id) VALUES ('31/870/0001', 'PERMANENT', 1);
INSERT INTO v_cph_customer_unit (cph, cph_type, core_id) VALUES ('31/870/0001', 'PERMANENT', 2);
INSERT INTO v_cph_customer_unit (cph, cph_type, core_id) VALUES ('31/870/0002', 'PERMANENT', 1);
INSERT INTO v_cph_customer_unit (cph, cph_type, core_id) VALUES ('31/870/0003', 'PERMANENT', 1);
INSERT INTO v_cph_customer_unit (cph, cph_type, core_id) VALUES ('31/870/0004', 'PERMANENT', 1);
INSERT INTO v_cph_customer_unit (cph, cph_type, core_id) VALUES ('31/870/0005', 'PERMANENT', 1);
INSERT INTO v_cph_customer_unit (cph, cph_type, core_id) VALUES ('31/870/0006', 'PERMANENT', 1);
INSERT INTO v_cph_customer_unit (cph, cph_type, core_id) VALUES ('31/870/0007', 'PERMANENT', 1);
INSERT INTO v_cph_customer_unit (cph, cph_type, core_id) VALUES ('31/870/0008', 'PERMANENT', 1);

-- 7) Holderships
--    returned: 31/870/0001 at L3187010 and L3187011, 31/870/0002 at 318712
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, vetnet_core_id, feature_involv_from_date)
VALUES (318731, 318710, '31/870/0001', 'CPHHOLDERSHIP', NULL, 31870101, 1, DATE '2015-01-01');
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, vetnet_core_id, feature_involv_from_date)
VALUES (318732, 318711, '31/870/0001', 'CPHHOLDERSHIP', NULL, 31870101, 2, DATE '2016-01-01');
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, vetnet_core_id, feature_involv_from_date)
VALUES (318733, 318712, '31/870/0002', 'CPHHOLDERSHIP', NULL, 31870101, 1, DATE '2017-01-01');
--    excluded: 31/870/0003 at an inactive feature
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, vetnet_core_id, feature_involv_from_date)
VALUES (318734, 318713, '31/870/0003', 'CPHHOLDERSHIP', NULL, 31870101, 1, DATE '2015-01-01');
--    excluded: 31/870/0004, an ended holdership
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, vetnet_core_id, feature_involv_from_date)
VALUES (318735, 318710, '31/870/0004', 'CPHHOLDERSHIP', DATE '2019-12-31', 31870101, 1, DATE '2010-01-01');
--    excluded: 31/870/0005 through an ended party role
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, vetnet_core_id, feature_involv_from_date)
VALUES (318736, 318711, '31/870/0005', 'CPHHOLDERSHIP', NULL, 31870105, 1, DATE '2010-01-01');
--    excluded: 31/870/0007 through a retired SAM role type
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, vetnet_core_id, feature_involv_from_date)
VALUES (318737, 318711, '31/870/0007', 'CPHHOLDERSHIP', NULL, 31870107, 1, DATE '2010-01-01');
--    C3187002 holds 31/870/0006 at L3187015; the inactive C3187003 holds
--    31/870/0008 at L3187016
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, vetnet_core_id, feature_involv_from_date)
VALUES (318738, 318715, '31/870/0006', 'CPHHOLDERSHIP', NULL, 31870201, 1, DATE '2016-01-01');
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, vetnet_core_id, feature_involv_from_date)
VALUES (318739, 318716, '31/870/0008', 'CPHHOLDERSHIP', NULL, 31870301, 1, DATE '2016-01-01');

-- 8) Owner of place: returned at L3187010; excluded at L3187014, which has
--    no holdership, and at L3187011, where the involvement ended
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, feature_involv_from_date, owner_of_place_status, ownership_last_checked_date)
VALUES (318741, 318710, NULL, 'OWNEROFLOCATION', NULL, 31870102, DATE '2015-01-01', 'CONFIRMED', DATE '2023-01-01');
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, feature_involv_from_date, owner_of_place_status, ownership_last_checked_date)
VALUES (318742, 318714, NULL, 'OWNEROFLOCATION', NULL, 31870102, DATE '2015-01-01', 'CONFIRMED', DATE '2023-01-01');
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, feature_involv_from_date, owner_of_place_status, ownership_last_checked_date)
VALUES (318743, 318711, NULL, 'OWNEROFLOCATION', DATE '2019-12-31', 31870102, DATE '2010-01-01', 'CONFIRMED', DATE '2018-01-01');

-- 9) Livestock units. U3187042's only primary location has ended
INSERT INTO asset (asset_pk, animal_pk) VALUES (318750, NULL);
INSERT INTO asset (asset_pk, animal_pk) VALUES (318751, NULL);
INSERT INTO asset (asset_pk, animal_pk) VALUES (318752, NULL);
INSERT INTO asset (asset_pk, animal_pk) VALUES (318753, NULL);
INSERT INTO asset (asset_pk, animal_pk) VALUES (318754, NULL);
INSERT INTO livestock_unit (asset_pk, unit_id) VALUES (318750, 'U3187040');
INSERT INTO livestock_unit (asset_pk, unit_id) VALUES (318751, 'U3187041');
INSERT INTO livestock_unit (asset_pk, unit_id) VALUES (318752, 'U3187042');
INSERT INTO livestock_unit (asset_pk, unit_id) VALUES (318753, 'U3187043');
INSERT INTO livestock_unit (asset_pk, unit_id) VALUES (318754, 'U3187044');
INSERT INTO asset_state (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (318750, 'ACTIVE', NULL);
INSERT INTO asset_state (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (318751, 'ACTIVE', NULL);
INSERT INTO asset_state (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (318752, 'ACTIVE', NULL);
INSERT INTO asset_state (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (318753, 'ACTIVE', NULL);
INSERT INTO asset_state (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (318754, 'ACTIVE', NULL);
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date, asset_location_from_date)
VALUES (318715, 318750, 'PRIMARYLOCATION', NULL, DATE '2016-01-01');
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date, asset_location_from_date)
VALUES (318715, 318751, 'PRIMARYLOCATION', NULL, DATE '2016-01-01');
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date, asset_location_from_date)
VALUES (318710, 318752, 'PRIMARYLOCATION', DATE '2019-12-31', DATE '2015-01-01');
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date, asset_location_from_date)
VALUES (318710, 318753, 'PRIMARYLOCATION', NULL, DATE '2015-01-01');
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date, asset_location_from_date)
VALUES (318716, 318754, 'PRIMARYLOCATION', NULL, DATE '2016-01-01');

-- 10) Keepers and owners of units
--    returned: C3187001 keeps and owns U3187040 at L3187015 (31/870/0006)
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date,
                               asset_involvement_to_date, ownership_status, keepership_status)
VALUES (318761, 318750, 31870103, 'PRIMARYKEEPEROF', DATE '2016-01-01', NULL, NULL, 'ACTIVE');
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date,
                               asset_involvement_to_date, ownership_status, keepership_status)
VALUES (318762, 318750, 31870104, 'OWNEROF', DATE '2016-01-01', NULL, 'ACTIVE', NULL);
--    excluded: an ended keepership of U3187041
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date,
                               asset_involvement_to_date, ownership_status, keepership_status)
VALUES (318763, 318751, 31870103, 'PRIMARYKEEPEROF', DATE '2016-01-01', DATE '2019-12-31', NULL, 'ACTIVE');
--    excluded: U3187042, whose primary location ended
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date,
                               asset_involvement_to_date, ownership_status, keepership_status)
VALUES (318764, 318752, 31870103, 'SECONDARYKEEPEROF', DATE '2015-01-01', NULL, NULL, 'ACTIVE');
--    excluded: U3187043 through an ended party role
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date,
                               asset_involvement_to_date, ownership_status, keepership_status)
VALUES (318765, 318753, 31870106, 'PRIMARYKEEPEROF', DATE '2015-01-01', NULL, NULL, 'ACTIVE');
--    excluded: U3187044 at L3187016, held only by the inactive C3187003
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date,
                               asset_involvement_to_date, ownership_status, keepership_status)
VALUES (318766, 318754, 31870103, 'PRIMARYKEEPEROF', DATE '2016-01-01', NULL, NULL, 'ACTIVE');

COMMIT;

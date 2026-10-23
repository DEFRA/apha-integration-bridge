-- ─────────────────────────────────────────────────────────────────────────────
--  015_add_holding_sub_resource_scenarios.sql
--  DSFAAP-2982: CPH 29/820/0001, which the holding sub-resource route tests
--  read end to end. It has three current holderships: core 1 at L298210 and
--  core 2 at L298220, both held by the person C2982001, and core 3 at L298210,
--  held by the organisation C2982002. Core 2 started last, so it is the
--  selected holdership, and SAM stores it twice. C2982001 is also the owner
--  of place of L298210, where the person C2982003 keeps the livestock unit
--  U298240. CPH 29/820/0002 is held at L298210 too, by C2982004, who must not
--  appear among the parties of 29/820/0001. The ids are SAM-shaped (C and L
--  numbers), as the find queries' id validation requires. C2982005, a party
--  with no current version, holds one postal address link for each rule
--  find-party-addresses.sql applies. The practice C2982006 is the
--  Official Veterinarian for U298240 and for U298241 at L298220, and the
--  Delivery Partner C2982007 for U298240; the practice C2982008's OVFOR on
--  U298240 has ended.
--  Runs after 001 to 014. The party version, person, organisation, address
--  and contact tables persist between container starts, so this script's
--  rows in them, keyed 2982xx, are deleted before they are inserted.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- 1) This script's own rows in the tables that persist
DELETE FROM address_usage WHERE party_contact_address_pk BETWEEN 29820000 AND 29829999;
DELETE FROM party_contact_address WHERE party_contact_address_pk BETWEEN 29820000 AND 29829999;
DELETE FROM telecom_address WHERE telecom_address_pk BETWEEN 29820000 AND 29829999;
DELETE FROM address WHERE address_pk BETWEEN 298200 AND 298299;
DELETE FROM person WHERE party_pk BETWEEN 298200 AND 298299;
DELETE FROM organisation WHERE party_pk BETWEEN 298200 AND 298299;
DELETE FROM party_version WHERE party_pk BETWEEN 298200 AND 298299;

--    ADDRESS_FROM_DATE, which find-party-addresses.sql reads and the local
--    ADDRESS table lacked; SAM always stores one
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE address ADD (address_from_date DATE)';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
UPDATE address SET address_from_date = DATE '2008-01-01' WHERE address_from_date IS NULL;

-- 2) L298210 has a position and two current addresses, the postal one
--    preferred although it is the older, and with SAM's country code and UK
--    nation both set; L298220 was migrated in 2008 and has neither
INSERT INTO feature (feature_pk, feature_name) VALUES (298210, 'Hill Top Farm');
INSERT INTO feature (feature_pk, feature_name) VALUES (298220, 'Low Barn');
INSERT INTO location (feature_pk, location_id) VALUES (298210, 'L298210');
INSERT INTO location (feature_pk, location_id) VALUES (298220, 'L298220');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (298210, 'COMPLETE', NULL, NULL, TIMESTAMP '2015-01-01 09:30:00');
INSERT INTO feature_state (feature_pk, feature_status_code, feature_state_to_dttm, feature_state_reason_code, feature_state_from_dttm)
VALUES (298220, 'MIGRATED', NULL, 'VETNETDATAMIG', TIMESTAMP '2008-01-31 00:00:00');

INSERT INTO feature_point (feature_pk, primary_feature_point_ind, feature_point_to_date, os_map_reference,
                           feature_point_pk, feature_point_type, easting, northing, feature_point_from_date)
VALUES (298210, 'Y', NULL, 'SK3530036300', 298250, 'ACCESSPOINT', 435300, 336300, DATE '2015-01-01');

INSERT INTO address (address_pk, address_from_date, address_to_date, non_postal_address_ind) VALUES (298261, DATE '2015-01-01', NULL, 'N');
INSERT INTO address (address_pk, address_from_date, address_to_date, non_postal_address_ind) VALUES (298262, DATE '2019-01-01', NULL, 'Y');
INSERT INTO bs7666_address (address_pk, paon_description, street, town, postcode, uk_internal_code, country_code)
VALUES (298261, 'Hill Top Farm', 'Hill Lane', 'Exampleton', 'EX2 9HT', 'England', 'GB');
INSERT INTO bs7666_address (address_pk, paon_description, street, town, postcode)
VALUES (298262, 'Hill Top Yard', 'Back Lane', 'Exampleton', 'EX2 9HY');
INSERT INTO feature_address (feature_pk, address_pk, feature_address_to_date, feature_address_pk, feature_address_from_date)
VALUES (298210, 298261, NULL, 298261, DATE '2015-01-01');
INSERT INTO feature_address (feature_pk, address_pk, feature_address_to_date, feature_address_pk, feature_address_from_date)
VALUES (298210, 298262, NULL, 298262, DATE '2019-01-01');

-- 3) The livestock units U298240, whose primary location is L298210, and
--    U298241 at L298220
INSERT INTO asset (asset_pk, animal_pk) VALUES (298240, NULL);
INSERT INTO livestock_unit (asset_pk, unit_id) VALUES (298240, 'U298240');
INSERT INTO asset_state (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (298240, 'ACTIVE', NULL);
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date, asset_location_from_date)
VALUES (298210, 298240, 'PRIMARYLOCATION', NULL, DATE '2016-04-01');
INSERT INTO asset (asset_pk, animal_pk) VALUES (298241, NULL);
INSERT INTO livestock_unit (asset_pk, unit_id) VALUES (298241, 'U298241');
INSERT INTO asset_state (asset_pk, asset_status_code, asset_state_to_dttm) VALUES (298241, 'ACTIVE', NULL);
INSERT INTO asset_location (feature_pk, asset_pk, asset_location_type, asset_location_to_date, asset_location_from_date)
VALUES (298220, 298241, 'PRIMARYLOCATION', NULL, DATE '2021-01-01');

-- 4) The parties and their roles, with a LANDOWNER role that 012 lacks
INSERT INTO role (role_pk, main_role_type, role_type) VALUES (6, 'CUSTOMER', 'LANDOWNER');
INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date) VALUES (298215, 'LANDOWNER', 2928, DATE '9999-12-31');
INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code) VALUES (298215, 'Land Owner', 'ENG');

--    C2982001: a person who holds cores 1 and 2 and owns L298210
INSERT INTO party (party_pk, party_id) VALUES (298201, 'C2982001');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (298201, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (298201, 'PERSON', DATE '9999-12-31');
INSERT INTO person (party_pk, person_title, person_given_name, person_given_name2, person_family_name)
VALUES (298201, 'MRS', 'Ann', NULL, 'Hill');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (29820101, 298201, NULL, 1, 'CUSTOMER', DATE '2015-01-01');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (29820102, 298201, NULL, 6, 'CUSTOMER', DATE '2016-01-01');

--    C2982002: an organisation that holds core 3
INSERT INTO party (party_pk, party_id) VALUES (298202, 'C2982002');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (298202, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (298202, 'ORGANISATION', DATE '9999-12-31');
INSERT INTO organisation (party_pk, organisation_name, primary_contact_full_name, organisation_type)
VALUES (298202, 'Hill Top Farms Ltd', 'J Hill', 'NOTKNOWN');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (29820201, 298202, NULL, 1, 'CUSTOMER', DATE '2018-03-01');

--    C2982003: a person who keeps U298240 and holds nothing
INSERT INTO party (party_pk, party_id) VALUES (298203, 'C2982003');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (298203, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (298203, 'PERSON', DATE '9999-12-31');
INSERT INTO person (party_pk, person_title, person_given_name, person_given_name2, person_family_name)
VALUES (298203, 'MR', 'Tom', NULL, 'Dale');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (29820301, 298203, NULL, 2, 'CUSTOMER', DATE '2016-04-01');

--    C2982004: a person who holds 29/820/0002
INSERT INTO party (party_pk, party_id) VALUES (298204, 'C2982004');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (298204, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (298204, 'PERSON', DATE '9999-12-31');
INSERT INTO person (party_pk, person_title, person_given_name, person_given_name2, person_family_name)
VALUES (298204, 'MS', 'Jo', NULL, 'Field');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (29820401, 298204, NULL, 1, 'CUSTOMER', DATE '2019-01-01');

-- 5) The holderships, keyed so that the rule "latest from date, then highest
--    key" is visible: core 2 is stored twice, and 29/820/0002 shares L298210
INSERT INTO v_cph_customer_unit (cph, cph_type, core_id) VALUES ('29/820/0001', 'PERMANENT', 1);
INSERT INTO v_cph_customer_unit (cph, cph_type, core_id) VALUES ('29/820/0001', 'TEMPORARY', 2);
INSERT INTO v_cph_customer_unit (cph, cph_type, core_id) VALUES ('29/820/0001', 'PERMANENT', 3);
INSERT INTO v_cph_customer_unit (cph, cph_type, core_id) VALUES ('29/820/0002', 'PERMANENT', 1);

INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, vetnet_core_id, feature_involv_from_date)
VALUES (298231, 298210, '29/820/0001', 'CPHHOLDERSHIP', NULL, 29820101, 1, DATE '2015-01-01');
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, vetnet_core_id, feature_involv_from_date)
VALUES (298232, 298220, '29/820/0001', 'CPHHOLDERSHIP', NULL, 29820101, 2, DATE '2020-06-01');
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, vetnet_core_id, feature_involv_from_date)
VALUES (298233, 298220, '29/820/0001', 'CPHHOLDERSHIP', NULL, 29820101, 2, DATE '2020-06-01');
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, vetnet_core_id, feature_involv_from_date)
VALUES (298234, 298210, '29/820/0001', 'CPHHOLDERSHIP', NULL, 29820201, 3, DATE '2018-03-01');
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, vetnet_core_id, feature_involv_from_date)
VALUES (298235, 298210, '29/820/0002', 'CPHHOLDERSHIP', NULL, 29820401, 1, DATE '2019-01-01');

-- 6) C2982001 is the confirmed owner of place of L298210, and C2982003 the
--    primary keeper of U298240
INSERT INTO feature_involvement (feature_involvement_pk, feature_pk, cph, feature_involvement_type, feature_involv_to_date,
                                 party_role_pk, feature_involv_from_date, owner_of_place_status, ownership_last_checked_date)
VALUES (298236, 298210, NULL, 'OWNEROFLOCATION', NULL, 29820102, DATE '2016-01-01', 'CONFIRMED', DATE '2023-05-01');
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date,
                               asset_involvement_to_date, ownership_status, keepership_status)
VALUES (298241, 298240, 29820301, 'PRIMARYKEEPEROF', DATE '2016-04-01', NULL, NULL, 'ACTIVE');

-- 7) C2982001's postal address and two mobiles that mask alike. The first
--    mobile is linked a second time, through the CPH Holder role: a duplicate
--    the API drops before masking
INSERT INTO address (address_pk, address_from_date, address_to_date, non_postal_address_ind) VALUES (298263, DATE '2015-01-01', NULL, 'N');
INSERT INTO bs7666_address (address_pk, paon_start_number, street, town, postcode, uk_internal_code, country_code)
VALUES (298263, 4, 'Mill Road', 'Exampleton', 'EX2 1MR', 'England', 'GB');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29820111, 298201, NULL, NULL, 298263, DATE '2015-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29820111, 29820111, 'CORRESPONDENCE', 'Y', DATE '2015-01-01', NULL);

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, mobile_number)
VALUES (29820121, 'MOBILE', DATE '2015-01-01', NULL, '07700 900101');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29820121, 298201, NULL, 29820121, NULL, DATE '2015-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29820121, 29820121, 'HOME', 'Y', DATE '2015-01-01', NULL);

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, mobile_number)
VALUES (29820122, 'MOBILE', DATE '2017-01-01', NULL, '07700 900201');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29820122, 298201, NULL, 29820122, NULL, DATE '2017-01-01', NULL);

INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29820123, NULL, 29820101, 29820121, NULL, DATE '2018-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29820123, 29820123, 'HOME', 'Y', DATE '2018-01-01', NULL);

-- 8) C2982002's landline, and a mobile that only starts in the future. Current
--    means no end date, as in find-customers.sql, so the mobile is current
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, telephone_number)
VALUES (29820221, 'LANDLINE', DATE '2018-03-01', NULL, '01234 500100');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29820221, 298202, NULL, 29820221, NULL, DATE '2018-03-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29820221, 29820221, 'PLACEOFBUSINESS', 'Y', DATE '2018-03-01', NULL);
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, mobile_number)
VALUES (29820222, 'MOBILE', DATE '2099-01-01', NULL, '07700 900222');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29820222, 298202, NULL, 29820222, NULL, DATE '2099-01-01', NULL);

-- 9) C2982003's e-mail and fax, neither with a usage row
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, internet_email_address)
VALUES (29820321, 'EMAIL', DATE '2016-04-01', NULL, 't.dale@example.com');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29820321, 298203, NULL, 29820321, NULL, DATE '2016-04-01', NULL);
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, fax_number)
VALUES (29820322, 'FAX', DATE '2016-04-01', NULL, '01234 567892');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29820322, 298203, NULL, 29820322, NULL, DATE '2016-04-01', NULL);

-- 10) C2982005, a party with no current version, and its postal address links:
--    current, with two current usages of which the HOME one is preferred;
--    ending in the future; starting in the future; ended; and current but to
--    an ended address. Current means no end date, so the first and third are
--    current.
INSERT INTO party (party_pk, party_id) VALUES (298205, 'C2982005');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (298205, 'ACTIVE', NULL);

INSERT INTO address (address_pk, address_from_date, address_to_date, non_postal_address_ind) VALUES (298271, DATE '2015-01-01', NULL, 'N');
INSERT INTO address (address_pk, address_from_date, address_to_date, non_postal_address_ind) VALUES (298272, DATE '2015-01-01', NULL, 'N');
INSERT INTO address (address_pk, address_from_date, address_to_date, non_postal_address_ind) VALUES (298273, DATE '2015-01-01', NULL, 'N');
INSERT INTO address (address_pk, address_from_date, address_to_date, non_postal_address_ind) VALUES (298274, DATE '2010-01-01', NULL, 'N');
INSERT INTO address (address_pk, address_from_date, address_to_date, non_postal_address_ind) VALUES (298275, DATE '2010-01-01', DATE '2020-01-01', 'N');
INSERT INTO bs7666_address (address_pk, street, town, postcode) VALUES (298271, 'Church Street', 'Exampleton', 'EX2 5CS');
INSERT INTO bs7666_address (address_pk, street, town, postcode) VALUES (298272, 'Station Road', 'Exampleton', 'EX2 5SR');
INSERT INTO bs7666_address (address_pk, street, town, postcode) VALUES (298273, 'New Road', 'Exampleton', 'EX2 5NR');
INSERT INTO bs7666_address (address_pk, street, town, postcode) VALUES (298274, 'Old Road', 'Exampleton', 'EX2 5OR');
INSERT INTO bs7666_address (address_pk, street, town, postcode) VALUES (298275, 'Gone Lane', 'Exampleton', 'EX2 5GL');

INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29820511, 298205, NULL, NULL, 298271, DATE '2015-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29820511, 29820511, 'CORRESPONDENCE', 'N', DATE '2015-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29820516, 29820511, 'HOME', 'Y', DATE '2018-01-01', NULL);
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29820512, 298205, NULL, NULL, 298272, DATE '2016-01-01', DATE '2099-12-31');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29820513, 298205, NULL, NULL, 298273, DATE '2099-01-01', NULL);
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29820514, 298205, NULL, NULL, 298274, DATE '2010-01-01', DATE '2020-01-01');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29820515, 298205, NULL, NULL, 298275, DATE '2010-01-01', NULL);

-- 11) The veterinary suppliers: SUPPLIER roles for an Official Veterinarian
--     practice and a Delivery Partner, which 012 lacks, and their OVFOR and
--     DPFOR involvements with U298240 and U298241. C2982008 was the practice
--     for U298240 until 2016.
INSERT INTO role (role_pk, main_role_type, role_type) VALUES (7, 'SUPPLIER', 'OVPRACTICE');
INSERT INTO role (role_pk, main_role_type, role_type) VALUES (8, 'SUPPLIER', 'DELIVERYPARTNER');

INSERT INTO party (party_pk, party_id) VALUES (298206, 'C2982006');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (298206, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (298206, 'ORGANISATION', DATE '9999-12-31');
INSERT INTO organisation (party_pk, organisation_name, primary_contact_full_name, organisation_type)
VALUES (298206, 'Hill Vets Ltd', NULL, 'NOTKNOWN');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (29820601, 298206, NULL, 7, 'SUPPLIER', DATE '2015-01-01');

INSERT INTO party (party_pk, party_id) VALUES (298207, 'C2982007');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (298207, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (298207, 'ORGANISATION', DATE '9999-12-31');
INSERT INTO organisation (party_pk, organisation_name, primary_contact_full_name, organisation_type)
VALUES (298207, 'Dale Delivery Partnership', NULL, 'NOTKNOWN');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (29820701, 298207, NULL, 8, 'SUPPLIER', DATE '2016-01-01');

INSERT INTO party (party_pk, party_id) VALUES (298208, 'C2982008');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (298208, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (298208, 'ORGANISATION', DATE '9999-12-31');
INSERT INTO organisation (party_pk, organisation_name, primary_contact_full_name, organisation_type)
VALUES (298208, 'Old Town Vets', NULL, 'NOTKNOWN');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (29820801, 298208, NULL, 7, 'SUPPLIER', DATE '2008-01-01');

INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date,
                               asset_involvement_to_date, ownership_status, keepership_status)
VALUES (298251, 298240, 29820601, 'OVFOR', DATE '2016-05-01', NULL, NULL, NULL);
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date,
                               asset_involvement_to_date, ownership_status, keepership_status)
VALUES (298252, 298240, 29820701, 'DPFOR', DATE '2022-01-01', NULL, NULL, NULL);
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date,
                               asset_involvement_to_date, ownership_status, keepership_status)
VALUES (298253, 298241, 29820601, 'OVFOR', DATE '2021-01-01', NULL, NULL, NULL);
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date,
                               asset_involvement_to_date, ownership_status, keepership_status)
VALUES (298254, 298240, 29820801, 'OVFOR', DATE '2010-01-01', DATE '2016-05-01', NULL, NULL);

COMMIT;

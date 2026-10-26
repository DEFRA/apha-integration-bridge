-- ─────────────────────────────────────────────────────────────────────────────
--  020_add_customer_and_organisation_search_scenarios.sql
--  Test data for POST /customers/find and POST /organisations/find:
--  C2990001 (person) and C2990002 (organisation) with roles and contacts.
--  Rows in the persistent tables are keyed 2990xx and deleted first.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- 1) This script's own rows in the tables that persist
DELETE FROM address_usage WHERE party_contact_address_pk BETWEEN 29900000 AND 29909999;
DELETE FROM party_contact_address WHERE party_contact_address_pk BETWEEN 29900000 AND 29909999;
DELETE FROM telecom_address WHERE telecom_address_pk BETWEEN 29900000 AND 29909999;
DELETE FROM person WHERE party_pk BETWEEN 299000 AND 299099;
DELETE FROM organisation WHERE party_pk BETWEEN 299000 AND 299099;
DELETE FROM party_version WHERE party_pk BETWEEN 299000 AND 299099;

-- 2) C2990001: two current roles and one ended role
INSERT INTO party (party_pk, party_id) VALUES (299001, 'C2990001');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (299001, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (299001, 'PERSON', DATE '9999-12-31');
INSERT INTO person (party_pk, person_title, person_given_name, person_given_name2, person_family_name)
VALUES (299001, 'MR', 'Sam', NULL, 'Search');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (29900101, 299001, NULL, 1, 'CUSTOMER', DATE '2015-01-01');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (29900102, 299001, NULL, 2, 'CUSTOMER', DATE '2016-01-01');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (29900103, 299001, DATE '2020-01-01', 4, 'CUSTOMER', DATE '2012-01-01');

--    two home mobiles that both mask to 0**********1
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, mobile_number)
VALUES (29900101, 'MOBILE', DATE '2015-01-01', NULL, '07700 900301');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29900101, 299001, NULL, 29900101, NULL, DATE '2015-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29900101, 29900101, 'HOME', 'Y', DATE '2015-01-01', NULL);

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, mobile_number)
VALUES (29900102, 'MOBILE', DATE '2016-01-01', NULL, '07700 900311');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29900102, 299001, NULL, 29900102, NULL, DATE '2016-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29900102, 29900102, 'HOME', 'N', DATE '2016-01-01', NULL);

--    a fax for correspondence
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, fax_number)
VALUES (29900103, 'FAX', DATE '2017-01-01', NULL, '01234 900303');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29900103, 299001, NULL, 29900103, NULL, DATE '2017-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29900103, 29900103, 'CORRESPONDENCE', 'N', DATE '2017-01-01', NULL);

--    a landline for a named secondary contact
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, telephone_number)
VALUES (29900104, 'LANDLINE', DATE '2018-01-01', NULL, '01234 900304');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29900104, 299001, NULL, 29900104, NULL, DATE '2018-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29900104, 29900104, 'SECONDARYCONTACT', 'N', DATE '2018-01-01', NULL);

--    an email with two usage types
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, internet_email_address)
VALUES (29900105, 'EMAIL', DATE '2019-01-01', NULL, 's.search@example.com');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29900105, 299001, NULL, 29900105, NULL, DATE '2019-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29900105, 29900105, 'CORRESPONDENCE', 'N', DATE '2019-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29900106, 29900105, 'PLACEOFBUSINESS', 'Y', DATE '2019-06-01', NULL);

--    a mobile held through a role
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, mobile_number)
VALUES (29900106, 'MOBILE', DATE '2020-01-01', NULL, '07700 900306');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29900106, NULL, 29900101, 29900106, NULL, DATE '2020-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29900107, 29900106, 'PLACEOFBUSINESS', 'N', DATE '2020-01-01', NULL);

-- 3) C2990002: two roles, and a landline, mobile, email and fax
INSERT INTO party (party_pk, party_id) VALUES (299002, 'C2990002');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (299002, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (299002, 'ORGANISATION', DATE '9999-12-31');
INSERT INTO organisation (party_pk, organisation_name, primary_contact_full_name, organisation_type)
VALUES (299002, 'Search Test Farms Ltd', 'P Search', 'NOTKNOWN');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (29900201, 299002, NULL, 1, 'CUSTOMER', DATE '2018-01-01');
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (29900202, 299002, NULL, 3, 'CUSTOMER', DATE '2019-01-01');

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, telephone_number)
VALUES (29900201, 'LANDLINE', DATE '2018-01-01', NULL, '01234 900307');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29900201, 299002, NULL, 29900201, NULL, DATE '2018-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29900201, 29900201, 'PLACEOFBUSINESS', 'Y', DATE '2018-01-01', NULL);

--    a mobile with no usage row
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, mobile_number)
VALUES (29900202, 'MOBILE', DATE '2019-01-01', NULL, '07700 900308');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29900202, 299002, NULL, 29900202, NULL, DATE '2019-01-01', NULL);

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, internet_email_address)
VALUES (29900203, 'EMAIL', DATE '2019-02-01', NULL, 'office@searchtest.example.com');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29900203, 299002, NULL, 29900203, NULL, DATE '2019-02-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29900203, 29900203, 'CORRESPONDENCE', 'N', DATE '2019-02-01', NULL);

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, fax_number)
VALUES (29900204, 'FAX', DATE '2019-03-01', NULL, '01234 900310');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29900204, 299002, NULL, 29900204, NULL, DATE '2019-03-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29900204, 29900204, 'PLACEOFBUSINESS', 'N', DATE '2019-03-01', NULL);

COMMIT;

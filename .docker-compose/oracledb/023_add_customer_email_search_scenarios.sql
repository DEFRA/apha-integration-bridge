-- ─────────────────────────────────────────────────────────────────────────────
--  023_add_customer_email_search_scenarios.sql
--  DSFAAP-3110: test data for the e-mail search on POST /customers/find.
--  Every party below holds shared.search@example.com in some form; only
--  C3110001 and C3110002 are returned for it. Rows are keyed 3110xx and
--  deleted first, so a restart (or a rerun) reseeds them cleanly.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- 1) This script's own rows
DELETE FROM party_contact_address WHERE party_contact_address_pk BETWEEN 31100000 AND 31109999;
DELETE FROM telecom_address WHERE telecom_address_pk BETWEEN 31100000 AND 31109999;
DELETE FROM bs7666_address WHERE address_pk BETWEEN 31100000 AND 31109999;
DELETE FROM address WHERE address_pk BETWEEN 31100000 AND 31109999;
DELETE FROM person WHERE party_pk BETWEEN 311000 AND 311099;
DELETE FROM organisation WHERE party_pk BETWEEN 311000 AND 311099;
DELETE FROM party_version WHERE party_pk BETWEEN 311000 AND 311099;
DELETE FROM party_state WHERE party_pk BETWEEN 311000 AND 311099;
DELETE FROM party WHERE party_pk BETWEEN 311000 AND 311099;

-- 2) C3110001 Hedge-Row: the e-mail recorded twice, once mixed case and
--    padded, so the customer is returned once. One current address, AB1 2CD,
--    and an ended one, ZZ9 9ZZ.
INSERT INTO party (party_pk, party_id) VALUES (311001, 'C3110001');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (311001, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (311001, 'PERSON', DATE '9999-12-31');
INSERT INTO person (party_pk, person_title, person_given_name, person_given_name2, person_family_name)
VALUES (311001, 'MS', 'Alex', NULL, 'Hedge-Row');

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, internet_email_address)
VALUES (31100101, 'EMAIL', DATE '2020-01-01', NULL, '  Shared.Search@Example.COM ');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (31100101, 311001, NULL, 31100101, NULL, DATE '2020-01-01', NULL);

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, internet_email_address)
VALUES (31100102, 'EMAIL', DATE '2021-01-01', NULL, 'shared.search@example.com');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (31100102, 311001, NULL, 31100102, NULL, DATE '2021-01-01', NULL);

INSERT INTO address (address_pk, address_to_date) VALUES (31100101, NULL);
INSERT INTO bs7666_address (address_pk, street, town, postcode) VALUES (31100101, 'Search Lane', 'Exampletown', 'AB1 2CD');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (31100103, 311001, NULL, NULL, 31100101, DATE '2020-01-01', NULL);

INSERT INTO address (address_pk, address_to_date) VALUES (31100102, NULL);
INSERT INTO bs7666_address (address_pk, street, town, postcode) VALUES (31100102, 'Old Road', 'Exampletown', 'ZZ9 9ZZ');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (31100104, 311001, NULL, NULL, 31100102, DATE '2010-01-01', DATE '2019-12-31');

-- 3) C3110002 O'Neill: the same e-mail, a different surname, and two current
--    addresses, one held in SAM lower case with no space
INSERT INTO party (party_pk, party_id) VALUES (311002, 'C3110002');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (311002, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (311002, 'PERSON', DATE '9999-12-31');
INSERT INTO person (party_pk, person_title, person_given_name, person_given_name2, person_family_name)
VALUES (311002, 'MR', 'Bryn', NULL, 'O''Neill');

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, internet_email_address)
VALUES (31100201, 'EMAIL', DATE '2020-01-01', NULL, 'shared.search@example.com');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (31100201, 311002, NULL, 31100201, NULL, DATE '2020-01-01', NULL);

INSERT INTO address (address_pk, address_to_date) VALUES (31100201, NULL);
INSERT INTO bs7666_address (address_pk, street, town, postcode) VALUES (31100201, 'Field Way', 'Exampletown', 'EF3 4GH');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (31100202, 311002, NULL, NULL, 31100201, DATE '2020-01-01', NULL);

INSERT INTO address (address_pk, address_to_date) VALUES (31100202, NULL);
INSERT INTO bs7666_address (address_pk, street, town, postcode) VALUES (31100202, 'Barn End', 'Exampletown', 'ij56kl');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (31100203, 311002, NULL, NULL, 31100202, DATE '2021-01-01', NULL);

-- 4) C3110003: the e-mail only through an ended contact link and through an
--    ended e-mail address, so not returned
INSERT INTO party (party_pk, party_id) VALUES (311003, 'C3110003');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (311003, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (311003, 'PERSON', DATE '9999-12-31');
INSERT INTO person (party_pk, person_title, person_given_name, person_given_name2, person_family_name)
VALUES (311003, 'MR', 'Cai', NULL, 'Ended');

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, internet_email_address)
VALUES (31100301, 'EMAIL', DATE '2015-01-01', NULL, 'shared.search@example.com');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (31100301, 311003, NULL, 31100301, NULL, DATE '2015-01-01', DATE '2019-12-31');

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, internet_email_address)
VALUES (31100302, 'EMAIL', DATE '2015-01-01', DATE '2019-12-31', 'shared.search@example.com');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (31100302, 311003, NULL, 31100302, NULL, DATE '2015-01-01', NULL);

-- 5) C3110004: an inactive person with the e-mail, not returned
INSERT INTO party (party_pk, party_id) VALUES (311004, 'C3110004');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (311004, 'INACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (311004, 'PERSON', DATE '9999-12-31');
INSERT INTO person (party_pk, person_title, person_given_name, person_given_name2, person_family_name)
VALUES (311004, 'MRS', 'Dilys', NULL, 'Inactive');

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, internet_email_address)
VALUES (31100401, 'EMAIL', DATE '2020-01-01', NULL, 'shared.search@example.com');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (31100401, 311004, NULL, 31100401, NULL, DATE '2020-01-01', NULL);

-- 6) C3110005: an organisation with the e-mail, not returned
INSERT INTO party (party_pk, party_id) VALUES (311005, 'C3110005');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (311005, 'ACTIVE', NULL);
INSERT INTO party_version (party_pk, party_type, party_version_to_datetime) VALUES (311005, 'ORGANISATION', DATE '9999-12-31');
INSERT INTO organisation (party_pk, organisation_name, primary_contact_full_name, organisation_type)
VALUES (311005, 'Shared Search Farms Ltd', 'S Search', 'NOTKNOWN');

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, internet_email_address)
VALUES (31100501, 'EMAIL', DATE '2020-01-01', NULL, 'shared.search@example.com');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (31100501, 311005, NULL, 31100501, NULL, DATE '2020-01-01', NULL);

COMMIT;

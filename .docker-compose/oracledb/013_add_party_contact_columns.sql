-- ─────────────────────────────────────────────────────────────────────────────
--  013_add_party_contact_columns.sql
--  DSFAAP-2929: the from-date, fax, country-code, extension and role-link
--  columns that find-party-contacts.sql reads, and one row for each case the
--  query must handle. The three contact tables persist between container
--  starts (004 creates them once and reseeds only its own rows), so every
--  change to them is guarded and the rows here, keyed in the 2929xxxx range,
--  are deleted before they are inserted. party and party_role are recreated
--  by 001 on every start; the from-date column that 012 also adds to
--  party_role is guarded, so 012 and 013 work with or without each other.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- 1) Columns the real SAM schema has and the local subset lacked
--    (ignore the error when a column already exists)
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE telecom_address ADD (
    telecom_address_from_date DATE,
    telephone_country_code    VARCHAR2(3),
    fax_number                VARCHAR2(35),
    extension_number          VARCHAR2(10)
  )';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE party_contact_address ADD (
    party_role_pk           NUMBER,
    party_contact_from_date DATE
  )';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
-- SAM links a contact to a party or to a party role, so the party key is optional
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE party_contact_address MODIFY (party_pk NULL)';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE address_usage ADD (
    address_usage_pk        NUMBER,
    address_usage_from_date DATE
  )';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE party_role ADD (party_role_from_date DATE)';
EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- 2) Backfill the rows 004 reseeds on every start: SAM always stores a from
--    date, and a key on every usage row
UPDATE telecom_address SET telecom_address_from_date = DATE '2008-01-01' WHERE telecom_address_from_date IS NULL;
UPDATE party_contact_address SET party_contact_from_date = DATE '2008-01-01' WHERE party_contact_from_date IS NULL;
UPDATE address_usage SET address_usage_pk = party_contact_address_pk WHERE address_usage_pk IS NULL;
UPDATE address_usage SET address_usage_from_date = DATE '2008-01-01' WHERE address_usage_from_date IS NULL;
UPDATE party_role SET party_role_from_date = DATE '2008-01-01' WHERE party_role_from_date IS NULL;

-- 3) This script's own rows in the tables that persist, so a restart reseeds
--    them cleanly
DELETE FROM address_usage WHERE party_contact_address_pk BETWEEN 29290000 AND 29299999;
DELETE FROM party_contact_address WHERE party_contact_address_pk BETWEEN 29290000 AND 29299999;
DELETE FROM telecom_address WHERE telecom_address_pk BETWEEN 29290000 AND 29299999;

-- 4) CUST-2929A (party 292901) holds every contact directly
INSERT INTO party (party_pk, party_id) VALUES (292901, 'CUST-2929A');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (292901, 'ACTIVE', NULL);

--    two current mobiles: the first preferred for home use, the second with
--    no usage row
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, mobile_number)
VALUES (29290101, 'MOBILE', DATE '2010-01-01', NULL, '07700 900101');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29290101, 292901, NULL, 29290101, NULL, DATE '2010-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29290101, 29290101, 'HOME', 'Y', DATE '2010-01-01', NULL);

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, mobile_number)
VALUES (29290102, 'MOBILE', DATE '2012-01-01', NULL, '07700 900102');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29290102, 292901, NULL, 29290102, NULL, DATE '2012-01-01', NULL);

--    a landline with a country code and extension
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, telephone_number, telephone_country_code, extension_number)
VALUES (29290103, 'LANDLINE', DATE '2014-01-01', NULL, '01234 567890', '44', '123');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29290103, 292901, NULL, 29290103, NULL, DATE '2014-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29290103, 29290103, 'CORRESPONDENCE', 'N', DATE '2014-01-01', NULL);

--    a fax, whose blank country code and preferred indicator the query
--    returns as null
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, fax_number, telephone_country_code)
VALUES (29290104, 'FAX', DATE '2016-01-01', NULL, '01234 567891', ' ');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29290104, 292901, NULL, 29290104, NULL, DATE '2016-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29290104, 29290104, 'CORRESPONDENCE', ' ', DATE '2016-01-01', NULL);

--    an e-mail with two current usage rows, returned once with the preferred
--    one
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, internet_email_address)
VALUES (29290105, 'EMAIL', DATE '2018-01-01', NULL, 'a.person@example.com');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29290105, 292901, NULL, 29290105, NULL, DATE '2018-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29290105, 29290105, 'CORRESPONDENCE', 'N', DATE '2018-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29290106, 29290105, 'PLACEOFBUSINESS', 'Y', DATE '2019-01-01', NULL);

--    a current link to a mobile that has ended, and an ended link to a
--    current landline: the query returns neither
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, mobile_number)
VALUES (29290106, 'MOBILE', DATE '2010-01-01', DATE '2020-01-01', '07700 900106');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29290106, 292901, NULL, 29290106, NULL, DATE '2010-01-01', NULL);
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, telephone_number)
VALUES (29290107, 'LANDLINE', DATE '2010-01-01', NULL, '01234 000000');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29290107, 292901, NULL, 29290107, NULL, DATE '2010-01-01', DATE '2021-01-01');

--    an e-mail stored as blanks, whose value comes back as null
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, internet_email_address)
VALUES (29290108, 'EMAIL', DATE '2019-01-01', NULL, '   ');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29290108, 292901, NULL, 29290108, NULL, DATE '2019-01-01', NULL);

-- 5) CUST-2929B (party 292902) holds its contacts through roles: a mobile
--    through a current role, and a landline through a role that ended
INSERT INTO party (party_pk, party_id) VALUES (292902, 'CUST-2929B');
INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm) VALUES (292902, 'ACTIVE', NULL);
INSERT INTO party_role (party_role_pk, party_pk, party_role_from_date, party_role_to_date) VALUES (29290201, 292902, DATE '2015-01-01', NULL);
INSERT INTO party_role (party_role_pk, party_pk, party_role_from_date, party_role_to_date) VALUES (29290202, 292902, DATE '2012-01-01', DATE '2020-01-01');

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, mobile_number)
VALUES (29290201, 'MOBILE', DATE '2015-01-01', NULL, '07700 900201');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29290201, NULL, 29290201, 29290201, NULL, DATE '2015-01-01', NULL);
INSERT INTO address_usage (address_usage_pk, party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_from_date, address_usage_to_date)
VALUES (29290201, 29290201, 'PLACEOFBUSINESS', 'Y', DATE '2015-01-01', NULL);

INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, telephone_number)
VALUES (29290202, 'LANDLINE', DATE '2012-01-01', NULL, '01234 000202');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29290202, NULL, 29290202, 29290202, NULL, DATE '2012-01-01', NULL);

-- 6) A current link that names neither a party nor a role, which the query
--    skips
INSERT INTO telecom_address (telecom_address_pk, telecom_address_type, telecom_address_from_date, telecom_address_to_date, internet_email_address)
VALUES (29290301, 'EMAIL', DATE '2010-01-01', NULL, 'nobody@example.com');
INSERT INTO party_contact_address (party_contact_address_pk, party_pk, party_role_pk, telecom_address_pk, address_pk, party_contact_from_date, party_contact_to_date)
VALUES (29290301, NULL, NULL, 29290301, NULL, DATE '2010-01-01', NULL);

COMMIT;

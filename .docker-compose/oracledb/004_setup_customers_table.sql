-- ─────────────────────────────────────────────────────────────────────────────
-- 004_setup_customers_table.sql
-- Minimal AHBRP customer schema + fake seed data for /customers/find tests.
-- Works alongside 001/002 holding setup scripts.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- Existing table from 002 needs one additional column for find-customers.sql
BEGIN
  EXECUTE IMMEDIATE '
    ALTER TABLE party
    ADD (secondary_contact_full_name VARCHAR2(255))
  ';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/

-- Core customer profile tables used by find-customers.sql
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE party_version (
      party_pk                   NUMBER        NOT NULL,
      party_type                 VARCHAR2(50)  NOT NULL,
      party_version_to_datetime  DATE          NOT NULL,
      CONSTRAINT party_version_pk PRIMARY KEY (party_pk, party_type)
    )
  ';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/

BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE person (
      party_pk            NUMBER         PRIMARY KEY,
      person_title        VARCHAR2(50),
      person_given_name   VARCHAR2(100),
      person_given_name2  VARCHAR2(100),
      person_family_name  VARCHAR2(100)
    )
  ';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/

BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE organisation (
      party_pk                    NUMBER         PRIMARY KEY,
      organisation_name           VARCHAR2(255),
      primary_contact_full_name   VARCHAR2(255)
    )
  ';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/

BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE address (
      address_pk       NUMBER        PRIMARY KEY,
      address_to_date  DATE
    )
  ';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/

BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE bs7666_address (
      address_pk                 NUMBER         PRIMARY KEY,
      paon_start_number          NUMBER,
      paon_start_number_suffix   NUMBER,
      paon_end_number            NUMBER,
      paon_end_number_suffix     NUMBER,
      paon_description           VARCHAR2(255),
      saon_description           VARCHAR2(255),
      saon_start_number          NUMBER,
      saon_start_number_suffix   NUMBER,
      saon_end_number            NUMBER,
      saon_end_number_suffix     NUMBER,
      street                     VARCHAR2(255),
      locality                   VARCHAR2(255),
      town                       VARCHAR2(255),
      administrative_area        VARCHAR2(255),
      postcode                   VARCHAR2(20),
      uk_internal_code           VARCHAR2(50),
      country_code               VARCHAR2(10)
    )
  ';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/

BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE telecom_address (
      telecom_address_pk       NUMBER         PRIMARY KEY,
      telecom_address_type     VARCHAR2(50)   NOT NULL,
      telecom_address_to_date  DATE,
      mobile_number            VARCHAR2(50),
      telephone_number         VARCHAR2(50),
      internet_email_address   VARCHAR2(255)
    )
  ';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/

BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE party_contact_address (
      party_contact_address_pk  NUMBER        PRIMARY KEY,
      party_pk                  NUMBER        NOT NULL,
      address_pk                NUMBER,
      telecom_address_pk        NUMBER,
      party_contact_to_date     DATE
    )
  ';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/

BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE address_usage (
      party_contact_address_pk     NUMBER        NOT NULL,
      address_usage_type           VARCHAR2(50),
      preferred_contact_method_ind VARCHAR2(1),
      address_usage_to_date        DATE,
      CONSTRAINT address_usage_pk PRIMARY KEY (
        party_contact_address_pk,
        address_usage_type
      )
    )
  ';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/

BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE alt_party_identity (
      party_pk                  NUMBER        NOT NULL,
      alt_party_identity_type   VARCHAR2(50)  NOT NULL,
      alt_party_identity_value  VARCHAR2(100),
      CONSTRAINT alt_party_identity_pk PRIMARY KEY (
        party_pk,
        alt_party_identity_type,
        alt_party_identity_value
      )
    )
  ';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/

-- Helpful indexes (ignore "already exists")
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_party_party_id ON party (party_id)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_ps_party_status ON party_state (party_pk, party_status_code, party_state_to_dttm)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_pca_party_pk ON party_contact_address (party_pk)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_pca_address_pk ON party_contact_address (address_pk)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_pca_telecom_pk ON party_contact_address (telecom_address_pk)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_addr_usage_to_date ON address_usage (address_usage_to_date)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- Ensure deterministic seed values for two fake customers used by route tests
DELETE FROM address_usage
WHERE party_contact_address_pk IN (81001, 81002, 81003, 82001, 82002, 82003);

DELETE FROM party_contact_address
WHERE party_contact_address_pk IN (81001, 81002, 81003, 82001, 82002, 82003);

DELETE FROM telecom_address
WHERE telecom_address_pk IN (91001, 91002, 91003);

DELETE FROM bs7666_address
WHERE address_pk IN (71001, 71002, 71003);

DELETE FROM address
WHERE address_pk IN (71001, 71002, 71003);

DELETE FROM alt_party_identity
WHERE party_pk IN (61001, 61002, 61003);

DELETE FROM organisation
WHERE party_pk IN (61001, 61002, 61003);

DELETE FROM person
WHERE party_pk IN (61001, 61002, 61003);

DELETE FROM party_version
WHERE party_pk IN (61001, 61002, 61003);

DELETE FROM party_state
WHERE party_pk IN (61001, 61002, 61003);

DELETE FROM party
WHERE party_pk IN (61001, 61002, 61003)
   OR party_id IN ('C123456', 'C234567', 'O123456');

-- Customer C123456: person with postal address + email + mobile
INSERT INTO party (party_pk, party_id, secondary_contact_full_name)
VALUES (61001, 'C123456', NULL);

INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm)
VALUES (61001, 'ACTIVE', NULL);

INSERT INTO party_version (party_pk, party_type, party_version_to_datetime)
VALUES (61001, 'PERSON', DATE '9999-12-31');

INSERT INTO person (
  party_pk, person_title, person_given_name, person_given_name2, person_family_name
)
VALUES (
  61001, 'MR', 'Bert', NULL, 'Farmer'
);

INSERT INTO address (address_pk, address_to_date)
VALUES (71001, NULL);

INSERT INTO bs7666_address (
  address_pk,
  paon_start_number,
  paon_start_number_suffix,
  paon_end_number,
  paon_end_number_suffix,
  paon_description,
  saon_description,
  saon_start_number,
  saon_start_number_suffix,
  saon_end_number,
  saon_end_number_suffix,
  street,
  locality,
  town,
  administrative_area,
  postcode,
  uk_internal_code,
  country_code
)
VALUES (
  71001,
  12,
  NULL,
  NULL,
  NULL,
  'Rose cottage',
  NULL,
  12,
  NULL,
  NULL,
  NULL,
  'Street',
  NULL,
  'Town',
  'County',
  '1AA A11',
  'UKX001',
  NULL
);

INSERT INTO party_contact_address (
  party_contact_address_pk, party_pk, address_pk, telecom_address_pk, party_contact_to_date
)
VALUES (
  81001, 61001, 71001, NULL, NULL
);

INSERT INTO address_usage (
  party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_to_date
)
VALUES (
  81001, 'POSTAL', 'N', NULL
);

INSERT INTO telecom_address (
  telecom_address_pk,
  telecom_address_type,
  telecom_address_to_date,
  mobile_number,
  telephone_number,
  internet_email_address
)
VALUES (
  91001,
  'EMAIL',
  NULL,
  NULL,
  NULL,
  'example@example.com'
);

INSERT INTO party_contact_address (
  party_contact_address_pk, party_pk, address_pk, telecom_address_pk, party_contact_to_date
)
VALUES (
  82001, 61001, NULL, 91001, NULL
);

INSERT INTO address_usage (
  party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_to_date
)
VALUES (
  82001, 'EMAIL', 'N', NULL
);

INSERT INTO telecom_address (
  telecom_address_pk,
  telecom_address_type,
  telecom_address_to_date,
  mobile_number,
  telephone_number,
  internet_email_address
)
VALUES (
  91002,
  'MOBILE',
  NULL,
  '+44 11111 11111',
  NULL,
  NULL
);

INSERT INTO party_contact_address (
  party_contact_address_pk, party_pk, address_pk, telecom_address_pk, party_contact_to_date
)
VALUES (
  82002, 61001, NULL, 91002, NULL
);

INSERT INTO address_usage (
  party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_to_date
)
VALUES (
  82002, 'MOBILE', 'Y', NULL
);

-- Organisation O123456: organisation record that should be excluded by /customers/find
INSERT INTO party (party_pk, party_id, secondary_contact_full_name)
VALUES (61003, 'O123456', 'John Contact');

INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm)
VALUES (61003, 'ACTIVE', NULL);

INSERT INTO party_version (party_pk, party_type, party_version_to_datetime)
VALUES (61003, 'ORGANISATION', DATE '9999-12-31');

INSERT INTO organisation (
  party_pk, organisation_name, primary_contact_full_name
)
VALUES (
  61003, 'Acme Farms Ltd', 'Jane Contact'
);

INSERT INTO address (address_pk, address_to_date)
VALUES (71003, NULL);

INSERT INTO bs7666_address (
  address_pk,
  paon_start_number,
  paon_start_number_suffix,
  paon_end_number,
  paon_end_number_suffix,
  paon_description,
  saon_description,
  saon_start_number,
  saon_start_number_suffix,
  saon_end_number,
  saon_end_number_suffix,
  street,
  locality,
  town,
  administrative_area,
  postcode,
  uk_internal_code,
  country_code
)
VALUES (
  71003,
  100,
  NULL,
  NULL,
  NULL,
  'Head office',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'Enterprise Way',
  NULL,
  'Town',
  'County',
  '2BB B22',
  'UKX002',
  'GB'
);

INSERT INTO party_contact_address (
  party_contact_address_pk, party_pk, address_pk, telecom_address_pk, party_contact_to_date
)
VALUES (
  81003, 61003, 71003, NULL, NULL
);

INSERT INTO address_usage (
  party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_to_date
)
VALUES (
  81003, 'POSTAL', 'N', NULL
);

-- Customer C234567: person with minimal address shell + preferred landline
INSERT INTO party (party_pk, party_id, secondary_contact_full_name)
VALUES (61002, 'C234567', NULL);

INSERT INTO party_state (party_pk, party_status_code, party_state_to_dttm)
VALUES (61002, 'ACTIVE', NULL);

INSERT INTO party_version (party_pk, party_type, party_version_to_datetime)
VALUES (61002, 'PERSON', DATE '9999-12-31');

INSERT INTO person (
  party_pk, person_title, person_given_name, person_given_name2, person_family_name
)
VALUES (
  61002, 'MRS', 'Roberta', NULL, 'Farmer'
);

INSERT INTO address (address_pk, address_to_date)
VALUES (71002, NULL);

-- Postal contact exists (required by query), but no BS7666 row -> API emits empty addresses array
INSERT INTO party_contact_address (
  party_contact_address_pk, party_pk, address_pk, telecom_address_pk, party_contact_to_date
)
VALUES (
  81002, 61002, 71002, NULL, NULL
);

INSERT INTO telecom_address (
  telecom_address_pk,
  telecom_address_type,
  telecom_address_to_date,
  mobile_number,
  telephone_number,
  internet_email_address
)
VALUES (
  91003,
  'LANDLINE',
  NULL,
  NULL,
  '+44 1111 11111',
  NULL
);

INSERT INTO party_contact_address (
  party_contact_address_pk, party_pk, address_pk, telecom_address_pk, party_contact_to_date
)
VALUES (
  82003, 61002, NULL, 91003, NULL
);

INSERT INTO address_usage (
  party_contact_address_pk, address_usage_type, preferred_contact_method_ind, address_usage_to_date
)
VALUES (
  82003, 'LANDLINE', 'Y', NULL
);

COMMIT;

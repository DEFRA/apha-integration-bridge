-- ─────────────────────────────────────────────────────────────────────────────
--  021_add_party_relationship_scenarios.sql
--  DSFAAP-3044: the PARTY_RELATIONSHIP table that find-party-organisations.sql
--  reads, and C2990001's relationships for POST /customers/find. Runs after
--  004 and 020, which seed the parties. The table is recreated on every start.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

BEGIN EXECUTE IMMEDIATE 'DROP TABLE party_relationship PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

CREATE TABLE party_relationship (
  party_relationship_pk     NUMBER       PRIMARY KEY,
  first_party_pk            NUMBER       NOT NULL,
  second_party_pk           NUMBER       NOT NULL,
  party_relationship_type   VARCHAR2(20) NOT NULL,
  party_relation_from_date  DATE         NOT NULL,
  party_relation_to_date    DATE
);

-- C2990001 is employed by and a business partner of C2990002, so it is
-- returned once
INSERT INTO party_relationship (party_relationship_pk, first_party_pk, second_party_pk, party_relationship_type, party_relation_from_date, party_relation_to_date)
VALUES (2990001, 299001, 299002, 'EMPLOYEDBY', DATE '2018-01-01', NULL);
INSERT INTO party_relationship (party_relationship_pk, first_party_pk, second_party_pk, party_relationship_type, party_relation_from_date, party_relation_to_date)
VALUES (2990002, 299001, 299002, 'BUSINESSPARTNEROF', DATE '2019-01-01', NULL);

-- an ended relationship with O123456, not returned
INSERT INTO party_relationship (party_relationship_pk, first_party_pk, second_party_pk, party_relationship_type, party_relation_from_date, party_relation_to_date)
VALUES (2990003, 299001, 61003, 'CUSTOMEROF', DATE '2010-01-01', DATE '2015-01-01');

-- a relationship with a person (C123456), not returned
INSERT INTO party_relationship (party_relationship_pk, first_party_pk, second_party_pk, party_relationship_type, party_relation_from_date, party_relation_to_date)
VALUES (2990004, 299001, 61001, 'FAMILYRELATION', DATE '2012-01-01', NULL);

COMMIT;

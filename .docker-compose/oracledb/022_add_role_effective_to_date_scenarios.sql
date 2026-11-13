-- ─────────────────────────────────────────────────────────────────────────────
--  022_add_role_effective_to_date_scenarios.sql
--  The ROLE_EFFECTIVE_TO_DATE column that find-party-roles.sql,
--  find-party-involvements.sql and find-supplier-involvements.sql read, and
--  one row for each case. SAM marks a current role with no end date or
--  31-DEC-9999, so a role is current until a date that has passed. Runs after
--  012 and 015, which recreate the role, party role and involvement tables and
--  seed the roles on every start.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

BEGIN EXECUTE IMMEDIATE 'ALTER TABLE role ADD (role_effective_to_date DATE)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- 1) The AGENT role ends on 31-DEC-9999, so CUST-AGENT01's role is still
--    current; every other seeded role has no end date
UPDATE role SET role_effective_to_date = DATE '9999-12-31' WHERE role_pk = 4;

-- 2) A livestock owner role and an Official Veterinarian practice role that
--    ended in 2020
INSERT INTO role (role_pk, main_role_type, role_type, role_effective_to_date) VALUES (9, 'CUSTOMER', 'LIVESTOCKOWNER', DATE '2020-01-01');
INSERT INTO role (role_pk, main_role_type, role_type, role_effective_to_date) VALUES (10, 'SUPPLIER', 'OVPRACTICE', DATE '2020-01-01');

-- 3) CUST-KEEPER02 holds a party role that has not ended on the ended livestock
--    owner role, and owns LU98001001 through it: neither the role nor the
--    ownership is returned
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (2928204, 29282, NULL, 9, 'CUSTOMER', DATE '2019-06-01');
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date,
                               asset_involvement_to_date, ownership_status, keepership_status)
VALUES (292826, 93001, 2928204, 'OWNEROF', DATE '2019-06-01', NULL, 'CONFIRMED', NULL);

-- 4) C2982008 holds a party role that has not ended on the ended practice
--    role, and is the Official Veterinarian for U298240 through it: the
--    involvement is not returned
INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date, role_pk, main_role_type, party_role_from_date)
VALUES (29820802, 298208, NULL, 10, 'SUPPLIER', DATE '2018-01-01');
INSERT INTO asset_involvement (asset_involvement_pk, asset_pk, party_role_pk, asset_involvement_type, asset_involvement_from_date,
                               asset_involvement_to_date, ownership_status, keepership_status)
VALUES (298255, 298240, 29820802, 'OVFOR', DATE '2018-01-01', NULL, NULL, NULL);

COMMIT;

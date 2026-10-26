-- ─────────────────────────────────────────────────────────────────────────────
--  020_add_non_county_administrative_areas.sql
--  Give the address fixtures a county value that is not a COUNTY code, so the
--  query and route tests can verify that the API returns it as SAM stores it.
--  Runs after 001 to 019. The added sub-location address is removed before
--  insertion so this fixture can also be loaded by hand into a running
--  container.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

UPDATE bs7666_address
   SET administrative_area = 'Exampleshire'
 WHERE address_pk IN (298262, 298263);

DELETE FROM feature_address
 WHERE feature_pk = 298391
   AND address_pk = 298501;
DELETE FROM bs7666_address WHERE address_pk = 298501;
DELETE FROM address WHERE address_pk = 298501;

INSERT INTO address (address_pk, address_from_date, address_to_date, non_postal_address_ind)
VALUES (298501, DATE '2020-01-01', NULL, 'N');
INSERT INTO bs7666_address (address_pk, street, administrative_area)
VALUES (298501, 'Status Lane', 'Exampleshire');
INSERT INTO feature_address (
  feature_pk,
  address_pk,
  feature_address_to_date,
  feature_address_pk,
  feature_address_from_date
)
VALUES (298391, 298501, NULL, 298501, DATE '2020-01-01');

COMMIT;

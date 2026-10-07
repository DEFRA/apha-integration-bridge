WITH party_type_now AS (
  SELECT
    pv.party_pk,
    CASE
      WHEN COUNT(DISTINCT pv.party_type) > 1 THEN 'MIXED'
      ELSE MAX(pv.party_type)
    END AS party_type
  FROM ahbrp.party_version pv
  WHERE (
      pv.party_version_from_datetime IS NULL
      OR pv.party_version_from_datetime <= SYSTIMESTAMP
    )
    AND (
      pv.party_version_to_datetime IS NULL
      OR pv.party_version_to_datetime > SYSTIMESTAMP
    )
  GROUP BY pv.party_pk
)
SELECT
  party_type,
  id_shape,
  COUNT(*) AS parties
FROM (
  SELECT
    ptn.party_type,
    SUBSTR(p.party_id, 1, 1) || REGEXP_REPLACE(
      REGEXP_REPLACE(SUBSTR(p.party_id, 2), '[A-Za-z]', 'A'),
      '[0-9]',
      '9'
    ) AS id_shape
  FROM ahbrp.party p
  LEFT JOIN party_type_now ptn
    ON ptn.party_pk = p.party_pk
)
GROUP BY party_type, id_shape
ORDER BY parties DESC

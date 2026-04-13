WITH target_party AS (
  SELECT p.party_pk, p.party_id
  FROM ahbrp.party p
  JOIN ahbrp.party_state ps
    ON ps.party_pk = p.party_pk
  WHERE ps.party_status_code <> 'INACTIVE'
    AND ps.party_state_to_dttm IS NULL
    AND p.party_id IN (__CUSTOMER_IDS__)
),
customer_type_candidates AS (
  SELECT tp.party_pk, 'PERSON' AS customer_type, 1 AS type_priority
  FROM target_party tp
  JOIN ahbrp.party_version pv
    ON pv.party_pk = tp.party_pk
   AND pv.party_type = 'PERSON'
   AND pv.party_version_to_datetime = '31-DEC-9999'
  JOIN ahbrp.person pe
    ON pe.party_pk = tp.party_pk

  UNION ALL

  SELECT tp.party_pk, 'ORGANISATION' AS customer_type, 2 AS type_priority
  FROM target_party tp
  JOIN ahbrp.party_version pv
    ON pv.party_pk = tp.party_pk
   AND pv.party_type = 'ORGANISATION'
   AND pv.party_version_to_datetime = '31-DEC-9999'
  JOIN ahbrp.organisation o
    ON o.party_pk = tp.party_pk
),
customer_type_by_party AS (
  SELECT
    ctc.party_pk,
    MAX(ctc.customer_type) KEEP (DENSE_RANK FIRST ORDER BY ctc.type_priority) AS customer_type
  FROM customer_type_candidates ctc
  GROUP BY ctc.party_pk
)
SELECT
  tp.party_id AS customer_id,
  ctbp.customer_type
FROM target_party tp
JOIN customer_type_by_party ctbp
  ON ctbp.party_pk = tp.party_pk

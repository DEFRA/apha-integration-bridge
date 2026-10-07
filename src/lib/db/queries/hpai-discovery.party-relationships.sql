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
  'PARTY' AS source,
  prel.party_relationship_type AS relationship_type,
  pt1.party_type AS first_party_type,
  CAST(NULL AS VARCHAR2(20)) AS first_role_type,
  pt2.party_type AS second_party_type,
  CAST(NULL AS VARCHAR2(20)) AS second_role_type,
  SUM(CASE WHEN prel.party_relation_to_date IS NULL THEN 1 ELSE 0 END) AS current_rows,
  SUM(CASE WHEN prel.party_relation_to_date IS NOT NULL THEN 1 ELSE 0 END) AS ended_rows
FROM ahbrp.party_relationship prel
LEFT JOIN party_type_now pt1
  ON pt1.party_pk = prel.first_party_pk
LEFT JOIN party_type_now pt2
  ON pt2.party_pk = prel.second_party_pk
GROUP BY prel.party_relationship_type, pt1.party_type, pt2.party_type
UNION ALL
SELECT
  'PARTY_ROLE' AS source,
  prr.party_role_rel_type AS relationship_type,
  pt1.party_type AS first_party_type,
  r1.role_type AS first_role_type,
  pt2.party_type AS second_party_type,
  r2.role_type AS second_role_type,
  SUM(CASE WHEN prr.party_role_rel_to_date IS NULL THEN 1 ELSE 0 END) AS current_rows,
  SUM(CASE WHEN prr.party_role_rel_to_date IS NOT NULL THEN 1 ELSE 0 END) AS ended_rows
FROM ahbrp.party_role_relationship prr
JOIN ahbrp.party_role pr1
  ON pr1.party_role_pk = prr.first_party_role_pk
JOIN ahbrp.role r1
  ON r1.role_pk = pr1.role_pk
JOIN ahbrp.party_role pr2
  ON pr2.party_role_pk = prr.second_party_role_pk
JOIN ahbrp.role r2
  ON r2.role_pk = pr2.role_pk
LEFT JOIN party_type_now pt1
  ON pt1.party_pk = pr1.party_pk
LEFT JOIN party_type_now pt2
  ON pt2.party_pk = pr2.party_pk
GROUP BY prr.party_role_rel_type, pt1.party_type, r1.role_type, pt2.party_type, r2.role_type
ORDER BY 1, 2, 7 DESC

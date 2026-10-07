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
),
current_roles AS (
  SELECT
    pr.role_pk,
    pr.main_role_type,
    ptn.party_type,
    COUNT(*) AS party_roles
  FROM ahbrp.party_role pr
  LEFT JOIN party_type_now ptn
    ON ptn.party_pk = pr.party_pk
  WHERE pr.party_role_to_date IS NULL
  GROUP BY pr.role_pk, pr.main_role_type, ptn.party_type
)
SELECT
  r.main_role_type,
  r.role_type,
  r.role_effective_from_date,
  r.role_effective_to_date,
  cr.party_type,
  NVL(cr.party_roles, 0) AS current_party_roles
FROM ahbrp.role r
LEFT JOIN current_roles cr
  ON cr.role_pk = r.role_pk
 AND cr.main_role_type = r.main_role_type
ORDER BY r.main_role_type, r.role_type, cr.party_type

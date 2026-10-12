WITH active_party AS (
  SELECT DISTINCT ps.party_pk
  FROM ahbrp.party_state ps
  WHERE ps.party_state_to_dttm IS NULL
    AND ps.party_status_code <> 'INACTIVE'
),
-- ORGANISATION has no ORGANISATIONAL_UNIT_TYPE column in the real schema
-- (first run: ORA-00904), so Defra units are told apart by a current
-- DEFRAORGROLE role instead
current_roles AS (
  SELECT
    pr.party_pk,
    MAX(CASE WHEN pr.main_role_type = 'DEFRAORGROLE' THEN 'Y' ELSE 'N' END) AS defra_org_role,
    MAX(CASE WHEN r.role_type = 'CPHHOLDER' THEN 'Y' ELSE 'N' END) AS cph_holder_role
  FROM ahbrp.party_role pr
  JOIN ahbrp.role r
    ON r.role_pk = pr.role_pk
  WHERE pr.party_role_to_date IS NULL
  GROUP BY pr.party_pk
)
SELECT
  o.organisation_type,
  o.head_office_indicator,
  CASE WHEN ap.party_pk IS NOT NULL THEN 'Y' ELSE 'N' END AS active,
  NVL(cr.defra_org_role, 'N') AS defra_org_role,
  NVL(cr.cph_holder_role, 'N') AS cph_holder_role,
  COUNT(*) AS organisations,
  COUNT(o.organisation_description) AS with_description
FROM ahbrp.organisation o
LEFT JOIN active_party ap
  ON ap.party_pk = o.party_pk
LEFT JOIN current_roles cr
  ON cr.party_pk = o.party_pk
GROUP BY
  o.organisation_type,
  o.head_office_indicator,
  CASE WHEN ap.party_pk IS NOT NULL THEN 'Y' ELSE 'N' END,
  NVL(cr.defra_org_role, 'N'),
  NVL(cr.cph_holder_role, 'N')
ORDER BY organisations DESC

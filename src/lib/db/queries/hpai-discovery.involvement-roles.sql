SELECT
  'FEATURE' AS source,
  fi.feature_involvement_type AS involvement_type,
  pr.main_role_type,
  r.role_type,
  COUNT(*) AS current_rows
FROM ahbrp.feature_involvement fi
JOIN ahbrp.party_role pr
  ON pr.party_role_pk = fi.party_role_pk
JOIN ahbrp.role r
  ON r.role_pk = pr.role_pk
WHERE fi.feature_involv_to_date IS NULL
GROUP BY fi.feature_involvement_type, pr.main_role_type, r.role_type
UNION ALL
SELECT
  'ASSET' AS source,
  ai.asset_involvement_type AS involvement_type,
  pr.main_role_type,
  r.role_type,
  COUNT(*) AS current_rows
FROM ahbrp.asset_involvement ai
JOIN ahbrp.party_role pr
  ON pr.party_role_pk = ai.party_role_pk
JOIN ahbrp.role r
  ON r.role_pk = pr.role_pk
WHERE ai.asset_involvement_to_date IS NULL
GROUP BY ai.asset_involvement_type, pr.main_role_type, r.role_type
ORDER BY 1, 2, 5 DESC

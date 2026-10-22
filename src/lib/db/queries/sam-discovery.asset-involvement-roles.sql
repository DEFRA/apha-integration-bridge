SELECT
  ai.asset_involvement_type,
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
ORDER BY ai.asset_involvement_type, current_rows DESC

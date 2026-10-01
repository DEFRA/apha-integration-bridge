SELECT
  r.role_type,
  api.alt_party_identity_type,
  COUNT(*) AS current_rows
FROM ahbrp.role r
JOIN ahbrp.party_role pr
  ON pr.role_pk = r.role_pk
 AND pr.main_role_type = r.main_role_type
 AND pr.party_role_to_date IS NULL
JOIN ahbrp.alt_party_identity api
  ON api.party_pk = pr.party_pk
 AND api.alt_party_identity_to_date IS NULL
WHERE r.main_role_type = 'SUPPLIER'
GROUP BY r.role_type, api.alt_party_identity_type
ORDER BY r.role_type, current_rows DESC

SELECT
  r.role_type,
  pv.party_type,
  COUNT(DISTINCT pr.party_pk) AS current_parties
FROM ahbrp.role r
JOIN ahbrp.party_role pr
  ON pr.role_pk = r.role_pk
 AND pr.main_role_type = r.main_role_type
 AND pr.party_role_to_date IS NULL
LEFT JOIN ahbrp.party_version pv
  ON pv.party_pk = pr.party_pk
 AND pv.party_version_to_datetime = '31-DEC-9999'
WHERE r.main_role_type = 'SUPPLIER'
GROUP BY r.role_type, pv.party_type
ORDER BY r.role_type, current_parties DESC

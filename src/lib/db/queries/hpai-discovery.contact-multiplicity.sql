WITH current_telecom AS (
  SELECT
    COALESCE(pca.party_pk, pr.party_pk) AS party_key,
    ta.telecom_address_type,
    ta.telecom_address_pk
  FROM ahbrp.party_contact_address pca
  JOIN ahbrp.telecom_address ta
    ON ta.telecom_address_pk = pca.telecom_address_pk
   AND ta.telecom_address_to_date IS NULL
  LEFT JOIN ahbrp.party_role pr
    ON pr.party_role_pk = pca.party_role_pk
  WHERE pca.party_contact_to_date IS NULL
),
per_party_type AS (
  SELECT
    ct.party_key,
    ct.telecom_address_type,
    COUNT(DISTINCT ct.telecom_address_pk) AS entries
  FROM current_telecom ct
  WHERE ct.party_key IS NOT NULL
  GROUP BY ct.party_key, ct.telecom_address_type
)
SELECT
  ppt.telecom_address_type,
  CASE
    WHEN ppt.entries = 1 THEN '1'
    WHEN ppt.entries = 2 THEN '2'
    WHEN ppt.entries <= 5 THEN '3-5'
    ELSE '6+'
  END AS entries_per_party,
  COUNT(*) AS parties,
  MAX(ppt.entries) AS largest
FROM per_party_type ppt
GROUP BY
  ppt.telecom_address_type,
  CASE
    WHEN ppt.entries = 1 THEN '1'
    WHEN ppt.entries = 2 THEN '2'
    WHEN ppt.entries <= 5 THEN '3-5'
    ELSE '6+'
  END
ORDER BY ppt.telecom_address_type, MIN(ppt.entries)

SELECT
  medium,
  telecom_address_type,
  address_usage_type,
  preferred_contact_method_ind,
  link_level,
  COUNT(*) AS current_links
FROM (
  SELECT
    CASE
      WHEN pca.telecom_address_pk IS NOT NULL THEN 'TELECOM'
      WHEN pca.address_pk IS NOT NULL THEN 'POSTAL'
      ELSE 'NEITHER'
    END AS medium,
    ta.telecom_address_type,
    au.address_usage_type,
    au.preferred_contact_method_ind,
    CASE
      WHEN pca.party_pk IS NOT NULL THEN 'PARTY'
      WHEN pca.party_role_pk IS NOT NULL THEN 'PARTY_ROLE'
      ELSE 'NEITHER'
    END AS link_level
  FROM ahbrp.party_contact_address pca
  LEFT JOIN ahbrp.telecom_address ta
    ON ta.telecom_address_pk = pca.telecom_address_pk
   AND ta.telecom_address_to_date IS NULL
  LEFT JOIN ahbrp.address_usage au
    ON au.party_contact_address_pk = pca.party_contact_address_pk
   AND au.address_usage_to_date IS NULL
  WHERE pca.party_contact_to_date IS NULL
)
GROUP BY medium, telecom_address_type, address_usage_type, preferred_contact_method_ind, link_level
ORDER BY medium, current_links DESC

SELECT
  medium,
  link_level,
  address_usage_type,
  usage_current,
  link_current,
  COUNT(*) AS usages,
  MIN(address_usage_from_date) AS earliest_from,
  MAX(address_usage_from_date) AS latest_from
FROM (
  SELECT
    CASE
      WHEN pca.telecom_address_pk IS NOT NULL THEN 'TELECOM'
      WHEN pca.address_pk IS NOT NULL THEN 'POSTAL'
      ELSE 'NEITHER'
    END AS medium,
    CASE
      WHEN pca.party_pk IS NOT NULL THEN 'PARTY'
      WHEN pca.party_role_pk IS NOT NULL THEN 'PARTY_ROLE'
      ELSE 'NEITHER'
    END AS link_level,
    au.address_usage_type,
    CASE WHEN au.address_usage_to_date IS NULL THEN 'Y' ELSE 'N' END AS usage_current,
    CASE
      WHEN pca.party_contact_address_pk IS NULL THEN NULL
      WHEN pca.party_contact_to_date IS NULL THEN 'Y'
      ELSE 'N'
    END AS link_current,
    au.address_usage_from_date
  FROM ahbrp.address_usage au
  LEFT JOIN ahbrp.party_contact_address pca
    ON pca.party_contact_address_pk = au.party_contact_address_pk
)
GROUP BY medium, link_level, address_usage_type, usage_current, link_current
ORDER BY medium, usages DESC

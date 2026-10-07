SELECT
  ic.table_name,
  ic.index_name,
  i.index_type,
  i.uniqueness,
  i.status,
  LISTAGG(ic.column_name, ', ') WITHIN GROUP (ORDER BY ic.column_position) AS indexed_columns
FROM all_ind_columns ic
JOIN all_indexes i
  ON i.owner = ic.index_owner
 AND i.index_name = ic.index_name
WHERE ic.table_owner = 'AHBRP'
  AND ic.table_name IN (
    'FEATURE', 'LOCATION', 'SUB_LOCATION', 'FEATURE_STATE', 'FEATURE_POINT',
    'FEATURE_ADDRESS', 'FEATURE_RELATIONSHIP', 'FEATURE_INVOLVEMENT', 'CPH',
    'ADDRESS', 'BS7666_ADDRESS', 'ASSET_LOCATION', 'ASSET_INVOLVEMENT',
    'PARTY', 'PARTY_VERSION', 'PARTY_STATE', 'PARTY_ROLE', 'PARTY_ROLE_STATE',
    'ROLE', 'PARTY_RELATIONSHIP', 'PARTY_ROLE_RELATIONSHIP', 'ORGANISATION',
    'PERSON', 'PARTY_CONTACT_ADDRESS', 'TELECOM_ADDRESS', 'ADDRESS_USAGE'
  )
GROUP BY ic.table_name, ic.index_name, i.index_type, i.uniqueness, i.status
ORDER BY ic.table_name, ic.index_name

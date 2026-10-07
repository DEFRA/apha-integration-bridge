SELECT
  c.table_name,
  c.column_name,
  c.data_type,
  c.data_length,
  c.data_precision,
  c.data_scale,
  c.nullable
FROM all_tab_columns c
WHERE c.owner = 'AHBRP'
  AND c.table_name IN (
    'FEATURE', 'LOCATION', 'SUB_LOCATION', 'FEATURE_STATE', 'FEATURE_POINT',
    'FEATURE_ADDRESS', 'FEATURE_RELATIONSHIP', 'FEATURE_INVOLVEMENT', 'CPH',
    'ADDRESS', 'BS7666_ADDRESS', 'ASSET_LOCATION', 'ASSET_INVOLVEMENT',
    'PARTY', 'PARTY_VERSION', 'PARTY_STATE', 'PARTY_ROLE', 'PARTY_ROLE_STATE',
    'ROLE', 'PARTY_RELATIONSHIP', 'PARTY_ROLE_RELATIONSHIP', 'ORGANISATION',
    'PERSON', 'PARTY_CONTACT_ADDRESS', 'TELECOM_ADDRESS', 'ADDRESS_USAGE'
  )
ORDER BY c.table_name, c.column_id

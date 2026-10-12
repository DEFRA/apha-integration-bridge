SELECT
  rds.ref_data_set_name,
  rdc.code,
  rdcd.short_description,
  CASE
    WHEN rds.effective_to_date IS NULL OR rds.effective_to_date > SYSDATE THEN 'Y'
    ELSE 'N'
  END AS set_current,
  CASE
    WHEN rdc.effective_to_date IS NULL OR rdc.effective_to_date > SYSDATE THEN 'Y'
    ELSE 'N'
  END AS code_current,
  rdc.effective_to_date AS code_effective_to_date
FROM ahbrp.ref_data_set rds
JOIN ahbrp.ref_data_code rdc
  ON rdc.ref_data_set_pk = rds.ref_data_set_pk
LEFT JOIN ahbrp.ref_data_code_desc rdcd
  ON rdcd.ref_data_code_pk = rdc.ref_data_code_pk
 AND rdcd.language_code = 'ENG'
WHERE (
    -- ended codes in the sets the contract's code lists come from
    rds.ref_data_set_name IN (
      'FEATURE_TYPE', 'FEATURE_GROUPING_TYPE', 'FEATURE_REGISTRATION_STATUS',
      'FEATURE_STATUS_REASON', 'FEATURE_POINT_TYPE', 'SUB_LOCATION_TYPE',
      'FEATURE_INVOLVEMENT_TYPE', 'ASSET_INVOLVEMENT_TYPE', 'KEEPERSHIP_STATUS',
      'CONFIRMATION_STATUS', 'CPH_TYPE', 'MAIN_ROLE_TYPE', 'ROLE_TYPE',
      'PARTY_ROLE_STATUS', 'PARTY_ROLE_STATUS_REASON', 'ADDRESS_USAGE_TYPE',
      'TELECOM_ADDRESS_USAGE', 'TELECOM_ADDRESS_TYPE', 'ORGANISATION_TYPE',
      'ORGANISATIONAL_UNIT_TYPE', 'PARTY_RELATIONSHIP_TYPE',
      'PARTY_ROLE_RELATIONSHIP_TYPE'
    )
    AND (rds.effective_to_date <= SYSDATE OR rdc.effective_to_date <= SYSDATE)
  )
  -- stored codes the first run found missing from their reference sets, and
  -- the secondary-contact usage the 2018 model describes, in any set or date
  OR rdc.code IN (
    'MIGRATED', 'NOTKNOWN', 'VETNETDATAMIG', 'COMMONLANDDATAMIG',
    'SRABPIDATAMIG', 'CDMDATAMIG'
  )
  OR UPPER(rdc.code) LIKE '%SECOND%'
  OR UPPER(rdcd.short_description) LIKE '%SECONDARY%CONTACT%'
ORDER BY rds.ref_data_set_name, rdc.code

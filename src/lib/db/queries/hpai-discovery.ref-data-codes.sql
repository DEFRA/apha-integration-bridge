SELECT
  rds.ref_data_set_name,
  rdc.code,
  rdcd.short_description
FROM ahbrp.ref_data_set rds
JOIN ahbrp.ref_data_code rdc
  ON rdc.ref_data_set_pk = rds.ref_data_set_pk
LEFT JOIN ahbrp.ref_data_code_desc rdcd
  ON rdcd.ref_data_code_pk = rdc.ref_data_code_pk
 AND rdcd.language_code = 'ENG'
WHERE (rds.effective_to_date IS NULL OR rds.effective_to_date > SYSDATE)
  AND (rdc.effective_to_date IS NULL OR rdc.effective_to_date > SYSDATE)
  AND REGEXP_LIKE(
    rds.ref_data_set_name,
    'ROLE|FEATURE|SUB_LOC|LOCATION|ORGANIS|USAGE|TELECOM|CONTACT|INVOLV|OWNER|KEEPER|POINT|RELAT|CPH|ASSET|STATUS|REASON'
  )
ORDER BY rds.ref_data_set_name, rdc.code

SELECT
  subtype,
  feature_status_code,
  feature_state_reason_code,
  COUNT(*) AS current_rows,
  COUNT(DISTINCT feature_pk) AS features,
  SUM(CASE WHEN current_states > 1 THEN 1 ELSE 0 END) AS rows_on_features_with_several,
  SUM(CASE WHEN feature_state_from_dttm > SYSTIMESTAMP THEN 1 ELSE 0 END) AS future_dated
FROM (
  SELECT
    fs.feature_pk,
    fs.feature_status_code,
    fs.feature_state_reason_code,
    fs.feature_state_from_dttm,
    COUNT(*) OVER (PARTITION BY fs.feature_pk) AS current_states,
    CASE
      WHEN l.feature_pk IS NOT NULL THEN 'LOCATION'
      WHEN sl.feature_pk IS NOT NULL THEN 'SUB_LOCATION'
      ELSE 'OTHER'
    END AS subtype
  FROM ahbrp.feature_state fs
  LEFT JOIN ahbrp.location l
    ON l.feature_pk = fs.feature_pk
  LEFT JOIN ahbrp.sub_location sl
    ON sl.feature_pk = fs.feature_pk
  WHERE fs.feature_state_to_dttm IS NULL
)
GROUP BY subtype, feature_status_code, feature_state_reason_code
ORDER BY subtype, current_rows DESC

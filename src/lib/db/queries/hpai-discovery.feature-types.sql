SELECT
  feature_type,
  subtype,
  COUNT(*) AS features
FROM (
  SELECT
    f.feature_type,
    CASE
      WHEN l.feature_pk IS NOT NULL THEN 'LOCATION'
      WHEN sl.feature_pk IS NOT NULL THEN 'SUB_LOCATION'
      ELSE 'OTHER'
    END AS subtype
  FROM ahbrp.feature f
  LEFT JOIN ahbrp.location l
    ON l.feature_pk = f.feature_pk
  LEFT JOIN ahbrp.sub_location sl
    ON sl.feature_pk = f.feature_pk
)
GROUP BY feature_type, subtype
ORDER BY features DESC

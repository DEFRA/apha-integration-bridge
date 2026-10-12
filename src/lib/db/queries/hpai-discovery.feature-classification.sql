SELECT
  subtype,
  feature_grouping_type,
  feature_class_type,
  feature_area_band,
  common_land_indicator,
  COUNT(*) AS features
FROM (
  SELECT
    f.feature_grouping_type,
    f.feature_class_type,
    f.feature_area_band,
    l.common_land_indicator,
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
GROUP BY
  subtype,
  feature_grouping_type,
  feature_class_type,
  feature_area_band,
  common_land_indicator
ORDER BY features DESC

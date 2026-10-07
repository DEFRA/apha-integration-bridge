SELECT
  subtype,
  points_per_feature,
  COUNT(*) AS features,
  SUM(CASE WHEN point_types > 1 THEN 1 ELSE 0 END) AS with_several_point_types
FROM (
  SELECT
    feature_pk,
    subtype,
    CASE
      WHEN COUNT(*) = 1 THEN '1'
      WHEN COUNT(*) = 2 THEN '2'
      ELSE '3+'
    END AS points_per_feature,
    COUNT(DISTINCT feature_point_type) AS point_types
  FROM (
    SELECT
      fp.feature_pk,
      fp.feature_point_type,
      CASE
      WHEN l.feature_pk IS NOT NULL THEN 'LOCATION'
      WHEN sl.feature_pk IS NOT NULL THEN 'SUB_LOCATION'
      ELSE 'OTHER'
    END AS subtype
    FROM ahbrp.feature_point fp
    LEFT JOIN ahbrp.location l
      ON l.feature_pk = fp.feature_pk
    LEFT JOIN ahbrp.sub_location sl
      ON sl.feature_pk = fp.feature_pk
    WHERE fp.primary_feature_point_ind = 'Y'
      AND fp.feature_point_to_date IS NULL
  )
  GROUP BY feature_pk, subtype
)
GROUP BY subtype, points_per_feature
ORDER BY subtype, points_per_feature

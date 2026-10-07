SELECT
  map_reference_shape,
  COUNT(*) AS points
FROM (
  SELECT
    REGEXP_REPLACE(
      REGEXP_REPLACE(UPPER(fp.os_map_reference), '[A-Z]', 'A'),
      '[0-9]',
      '9'
    ) AS map_reference_shape
  FROM ahbrp.feature_point fp
  WHERE fp.primary_feature_point_ind = 'Y'
    AND fp.feature_point_to_date IS NULL
    AND fp.os_map_reference IS NOT NULL
)
GROUP BY map_reference_shape
ORDER BY points DESC

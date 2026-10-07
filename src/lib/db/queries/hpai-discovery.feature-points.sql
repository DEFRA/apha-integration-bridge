SELECT
  subtype,
  feature_point_type,
  COUNT(*) AS points,
  COUNT(DISTINCT feature_pk) AS features,
  SUM(CASE WHEN easting IS NULL OR northing IS NULL THEN 1 ELSE 0 END) AS without_easting_northing,
  SUM(
    CASE
      WHEN (easting IS NULL OR northing IS NULL) AND os_map_reference IS NOT NULL THEN 1
      ELSE 0
    END
  ) AS map_reference_only,
  SUM(
    CASE
      WHEN easting NOT BETWEEN 0 AND 700000 OR northing NOT BETWEEN 0 AND 1300000 THEN 1
      ELSE 0
    END
  ) AS outside_national_grid,
  MIN(easting) AS min_easting,
  MAX(easting) AS max_easting,
  MIN(northing) AS min_northing,
  MAX(northing) AS max_northing
FROM (
  SELECT
    fp.feature_pk,
    fp.feature_point_type,
    fp.easting,
    fp.northing,
    fp.os_map_reference,
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
GROUP BY subtype, feature_point_type
ORDER BY subtype, points DESC

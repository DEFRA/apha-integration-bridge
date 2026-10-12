SELECT
  subtype,
  coordinate_class,
  COUNT(*) AS points,
  COUNT(os_map_reference) AS with_map_reference
FROM (
  SELECT
    fp.os_map_reference,
    CASE
      WHEN l.feature_pk IS NOT NULL THEN 'LOCATION'
      WHEN sl.feature_pk IS NOT NULL THEN 'SUB_LOCATION'
      ELSE 'OTHER'
    END AS subtype,
    -- zeros first, then the coarsest grid the point sits on: a point to the
    -- nearest 100 m most likely came from a six-figure map reference
    CASE
      WHEN fp.easting IS NULL OR fp.northing IS NULL THEN 'MISSING'
      WHEN fp.easting = 0 AND fp.northing = 0 THEN 'BOTH_ZERO'
      WHEN fp.easting = 0 OR fp.northing = 0 THEN 'ONE_ZERO'
      WHEN MOD(fp.easting, 1000) = 0 AND MOD(fp.northing, 1000) = 0 THEN 'NEAREST_1000M'
      WHEN MOD(fp.easting, 100) = 0 AND MOD(fp.northing, 100) = 0 THEN 'NEAREST_100M'
      WHEN MOD(fp.easting, 10) = 0 AND MOD(fp.northing, 10) = 0 THEN 'NEAREST_10M'
      ELSE 'NEAREST_1M'
    END AS coordinate_class
  FROM ahbrp.feature_point fp
  LEFT JOIN ahbrp.location l
    ON l.feature_pk = fp.feature_pk
  LEFT JOIN ahbrp.sub_location sl
    ON sl.feature_pk = fp.feature_pk
  WHERE fp.primary_feature_point_ind = 'Y'
    AND fp.feature_point_to_date IS NULL
)
GROUP BY subtype, coordinate_class
ORDER BY subtype, points DESC

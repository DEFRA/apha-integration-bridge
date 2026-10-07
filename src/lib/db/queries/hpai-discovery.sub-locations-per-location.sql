WITH location_sub_location AS (
  SELECT fr.first_feature_pk AS location_pk, fr.second_feature_pk AS sub_location_pk
  FROM ahbrp.feature_relationship fr
  JOIN ahbrp.location l
    ON l.feature_pk = fr.first_feature_pk
  JOIN ahbrp.sub_location sl
    ON sl.feature_pk = fr.second_feature_pk
  WHERE fr.feature_relatn_to_date IS NULL
  UNION
  SELECT fr.second_feature_pk AS location_pk, fr.first_feature_pk AS sub_location_pk
  FROM ahbrp.feature_relationship fr
  JOIN ahbrp.location l
    ON l.feature_pk = fr.second_feature_pk
  JOIN ahbrp.sub_location sl
    ON sl.feature_pk = fr.first_feature_pk
  WHERE fr.feature_relatn_to_date IS NULL
),
per_location AS (
  SELECT lsl.location_pk, COUNT(*) AS sub_locations
  FROM location_sub_location lsl
  GROUP BY lsl.location_pk
)
SELECT
  CASE
    WHEN pl.sub_locations = 1 THEN '1'
    WHEN pl.sub_locations <= 5 THEN '2-5'
    WHEN pl.sub_locations <= 10 THEN '6-10'
    WHEN pl.sub_locations <= 50 THEN '11-50'
    ELSE '51+'
  END AS sub_locations_per_location,
  COUNT(*) AS locations,
  MAX(pl.sub_locations) AS largest
FROM per_location pl
GROUP BY
  CASE
    WHEN pl.sub_locations = 1 THEN '1'
    WHEN pl.sub_locations <= 5 THEN '2-5'
    WHEN pl.sub_locations <= 10 THEN '6-10'
    WHEN pl.sub_locations <= 50 THEN '11-50'
    ELSE '51+'
  END
ORDER BY MIN(pl.sub_locations)

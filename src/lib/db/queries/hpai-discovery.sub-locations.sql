WITH linked_to_location AS (
  SELECT fr.second_feature_pk AS sub_location_pk
  FROM ahbrp.feature_relationship fr
  JOIN ahbrp.location l
    ON l.feature_pk = fr.first_feature_pk
  WHERE fr.feature_relatn_to_date IS NULL
  UNION
  SELECT fr.first_feature_pk AS sub_location_pk
  FROM ahbrp.feature_relationship fr
  JOIN ahbrp.location l
    ON l.feature_pk = fr.second_feature_pk
  WHERE fr.feature_relatn_to_date IS NULL
)
SELECT
  sl.sub_location_type,
  COUNT(*) AS sub_locations,
  COUNT(sl.usable_area) AS with_usable_area,
  COUNT(sl.usual_stock_quantity) AS with_usual_stock_quantity,
  COUNT(sl.broiler_stockg_density_range) AS with_broiler_density_range,
  SUM(CASE WHEN k.sub_location_pk IS NOT NULL THEN 1 ELSE 0 END) AS linked_to_a_location
FROM ahbrp.sub_location sl
LEFT JOIN linked_to_location k
  ON k.sub_location_pk = sl.feature_pk
GROUP BY sl.sub_location_type
ORDER BY sub_locations DESC

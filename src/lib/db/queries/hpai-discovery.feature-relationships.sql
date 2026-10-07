SELECT
  feature_relationship_type,
  location_contain_top_obj_typ,
  location_in_zone_type,
  first_subtype,
  second_subtype,
  is_current,
  COUNT(*) AS relationships
FROM (
  SELECT
    fr.feature_relationship_type,
    fr.location_contain_top_obj_typ,
    fr.location_in_zone_type,
    CASE
      WHEN l1.feature_pk IS NOT NULL THEN 'LOCATION'
      WHEN s1.feature_pk IS NOT NULL THEN 'SUB_LOCATION'
      ELSE 'OTHER'
    END AS first_subtype,
    CASE
      WHEN l2.feature_pk IS NOT NULL THEN 'LOCATION'
      WHEN s2.feature_pk IS NOT NULL THEN 'SUB_LOCATION'
      ELSE 'OTHER'
    END AS second_subtype,
    CASE WHEN fr.feature_relatn_to_date IS NULL THEN 'Y' ELSE 'N' END AS is_current
  FROM ahbrp.feature_relationship fr
  LEFT JOIN ahbrp.location l1
    ON l1.feature_pk = fr.first_feature_pk
  LEFT JOIN ahbrp.sub_location s1
    ON s1.feature_pk = fr.first_feature_pk
  LEFT JOIN ahbrp.location l2
    ON l2.feature_pk = fr.second_feature_pk
  LEFT JOIN ahbrp.sub_location s2
    ON s2.feature_pk = fr.second_feature_pk
)
GROUP BY
  feature_relationship_type,
  location_contain_top_obj_typ,
  location_in_zone_type,
  first_subtype,
  second_subtype,
  is_current
ORDER BY relationships DESC

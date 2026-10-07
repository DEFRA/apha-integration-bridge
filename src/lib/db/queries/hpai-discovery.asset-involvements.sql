SELECT
  ai.asset_involvement_type,
  ai.keepership_status,
  ai.ownership_status,
  CASE WHEN ai.asset_involvement_to_date IS NULL THEN 'Y' ELSE 'N' END AS is_current,
  COUNT(*) AS involvements
FROM ahbrp.asset_involvement ai
GROUP BY
  ai.asset_involvement_type,
  ai.keepership_status,
  ai.ownership_status,
  CASE WHEN ai.asset_involvement_to_date IS NULL THEN 'Y' ELSE 'N' END
ORDER BY ai.asset_involvement_type, involvements DESC

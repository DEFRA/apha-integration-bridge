SELECT
  ai.asset_involvement_type,
  COUNT(*) AS current_rows
FROM ahbrp.asset_involvement ai
WHERE ai.asset_involvement_to_date IS NULL
GROUP BY ai.asset_involvement_type
ORDER BY current_rows DESC

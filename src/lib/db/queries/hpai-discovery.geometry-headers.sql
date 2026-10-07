SELECT
  header_bytes,
  COUNT(*) AS sampled_geometries,
  MIN(geometry_bytes) AS min_geometry_bytes,
  MAX(geometry_bytes) AS max_geometry_bytes
FROM (
  SELECT
    RAWTOHEX(DBMS_LOB.SUBSTR(f.feature_geometry, 5, 1)) AS header_bytes,
    DBMS_LOB.GETLENGTH(f.feature_geometry) AS geometry_bytes
  FROM ahbrp.feature f
  WHERE f.feature_geometry IS NOT NULL
  FETCH FIRST 1000 ROWS ONLY
)
GROUP BY header_bytes
ORDER BY sampled_geometries DESC

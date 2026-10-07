SELECT
  feature_type,
  subtype,
  has_geometry,
  COUNT(*) AS features,
  SUM(has_shape_file_id) AS with_shape_file_id,
  MIN(shape_file_id_shape) AS shape_file_id_shape_min,
  MAX(shape_file_id_shape) AS shape_file_id_shape_max,
  MIN(geometry_bytes) AS min_geometry_bytes,
  MAX(geometry_bytes) AS max_geometry_bytes,
  ROUND(AVG(geometry_bytes)) AS avg_geometry_bytes
FROM (
  SELECT
    f.feature_type,
    CASE
      WHEN l.feature_pk IS NOT NULL THEN 'LOCATION'
      WHEN sl.feature_pk IS NOT NULL THEN 'SUB_LOCATION'
      ELSE 'OTHER'
    END AS subtype,
    CASE WHEN f.feature_geometry IS NOT NULL THEN 'Y' ELSE 'N' END AS has_geometry,
    CASE
      WHEN f.feature_geometry IS NOT NULL
        THEN DBMS_LOB.GETLENGTH(f.feature_geometry)
    END AS geometry_bytes,
    CASE WHEN f.shape_file_id IS NOT NULL THEN 1 ELSE 0 END AS has_shape_file_id,
    REGEXP_REPLACE(
      REGEXP_REPLACE(SUBSTR(f.shape_file_id, 1, 60), '[A-Za-z]', 'A'),
      '[0-9]',
      '9'
    ) AS shape_file_id_shape
  FROM ahbrp.feature f
  LEFT JOIN ahbrp.location l
    ON l.feature_pk = f.feature_pk
  LEFT JOIN ahbrp.sub_location sl
    ON sl.feature_pk = f.feature_pk
)
GROUP BY feature_type, subtype, has_geometry
ORDER BY feature_type, subtype, has_geometry

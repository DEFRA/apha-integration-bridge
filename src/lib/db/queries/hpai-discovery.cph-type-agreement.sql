SELECT
  fi.temporary_cph_indicator,
  c.cph_type,
  CASE WHEN fi.feature_involv_to_date IS NULL THEN 'Y' ELSE 'N' END AS is_current,
  COUNT(*) AS holderships
FROM ahbrp.feature_involvement fi
LEFT JOIN ahbrp.cph c
  ON c.cph = fi.cph
 AND c.core_id = fi.vetnet_core_id
WHERE fi.feature_involvement_type = 'CPHHOLDERSHIP'
GROUP BY
  fi.temporary_cph_indicator,
  c.cph_type,
  CASE WHEN fi.feature_involv_to_date IS NULL THEN 'Y' ELSE 'N' END
ORDER BY is_current DESC, holderships DESC

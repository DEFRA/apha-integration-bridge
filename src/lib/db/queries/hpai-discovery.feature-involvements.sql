SELECT
  fi.feature_involvement_type,
  fi.owner_of_place_status,
  fi.temporary_cph_indicator,
  CASE WHEN fi.feature_involv_to_date IS NULL THEN 'Y' ELSE 'N' END AS is_current,
  COUNT(*) AS involvements,
  COUNT(fi.cph) AS with_cph,
  COUNT(fi.ownership_last_checked_date) AS with_last_checked,
  MIN(fi.ownership_last_checked_date) AS earliest_last_checked,
  MAX(fi.ownership_last_checked_date) AS latest_last_checked
FROM ahbrp.feature_involvement fi
GROUP BY
  fi.feature_involvement_type,
  fi.owner_of_place_status,
  fi.temporary_cph_indicator,
  CASE WHEN fi.feature_involv_to_date IS NULL THEN 'Y' ELSE 'N' END
ORDER BY fi.feature_involvement_type, involvements DESC

WITH address_links AS (
  SELECT
    fa.feature_pk,
    SUM(CASE WHEN fa.feature_address_to_date IS NULL THEN 1 ELSE 0 END) AS current_links,
    SUM(CASE WHEN fa.feature_address_to_date IS NOT NULL THEN 1 ELSE 0 END) AS ended_links
  FROM ahbrp.feature_address fa
  GROUP BY fa.feature_pk
),
current_state AS (
  SELECT
    fs.feature_pk,
    fs.feature_status_code,
    fs.feature_state_reason_code
  FROM ahbrp.feature_state fs
  WHERE fs.feature_state_to_dttm IS NULL
),
held_location AS (
  SELECT DISTINCT fi.feature_pk
  FROM ahbrp.feature_involvement fi
  WHERE fi.feature_involvement_type = 'CPHHOLDERSHIP'
    AND fi.feature_involv_to_date IS NULL
),
-- locations whose current CPH holder has a current postal address, the
-- fallback a consumer might use when the location has none
holder_with_postal_address AS (
  SELECT DISTINCT fi.feature_pk
  FROM ahbrp.feature_involvement fi
  JOIN ahbrp.party_role pr
    ON pr.party_role_pk = fi.party_role_pk
  JOIN ahbrp.party_contact_address pca
    ON pca.party_pk = pr.party_pk
  WHERE fi.feature_involvement_type = 'CPHHOLDERSHIP'
    AND fi.feature_involv_to_date IS NULL
    AND pr.party_role_to_date IS NULL
    AND pca.address_pk IS NOT NULL
    AND pca.party_contact_to_date IS NULL
)
SELECT
  cs.feature_status_code,
  cs.feature_state_reason_code,
  CASE WHEN NVL(al.current_links, 0) > 0 THEN 'Y' ELSE 'N' END AS has_current_address,
  CASE WHEN NVL(al.ended_links, 0) > 0 THEN 'Y' ELSE 'N' END AS has_ended_address,
  COUNT(*) AS locations,
  COUNT(hl.feature_pk) AS currently_held,
  COUNT(hp.feature_pk) AS holder_has_postal_address
FROM ahbrp.location l
LEFT JOIN current_state cs
  ON cs.feature_pk = l.feature_pk
LEFT JOIN address_links al
  ON al.feature_pk = l.feature_pk
LEFT JOIN held_location hl
  ON hl.feature_pk = l.feature_pk
LEFT JOIN holder_with_postal_address hp
  ON hp.feature_pk = l.feature_pk
GROUP BY
  cs.feature_status_code,
  cs.feature_state_reason_code,
  CASE WHEN NVL(al.current_links, 0) > 0 THEN 'Y' ELSE 'N' END,
  CASE WHEN NVL(al.ended_links, 0) > 0 THEN 'Y' ELSE 'N' END
ORDER BY locations DESC

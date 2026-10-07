WITH active_party AS (
  SELECT DISTINCT ps.party_pk
  FROM ahbrp.party_state ps
  WHERE ps.party_state_to_dttm IS NULL
    AND ps.party_status_code <> 'INACTIVE'
)
SELECT
  o.organisation_type,
  o.organisational_unit_type,
  o.head_office_indicator,
  CASE WHEN ap.party_pk IS NOT NULL THEN 'Y' ELSE 'N' END AS active,
  COUNT(*) AS organisations,
  COUNT(o.organisation_description) AS with_description
FROM ahbrp.organisation o
LEFT JOIN active_party ap
  ON ap.party_pk = o.party_pk
GROUP BY
  o.organisation_type,
  o.organisational_unit_type,
  o.head_office_indicator,
  CASE WHEN ap.party_pk IS NOT NULL THEN 'Y' ELSE 'N' END
ORDER BY organisations DESC

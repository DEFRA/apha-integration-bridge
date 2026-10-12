-- the active-holdership predicate from hpai-discovery.cph-holderships.sql,
-- one row per holdership
WITH active_holdership AS (
  SELECT DISTINCT
    fi.feature_involvement_pk,
    fi.cph,
    fi.vetnet_core_id,
    fi.feature_pk,
    fi.feature_involv_from_date,
    pr.party_pk
  FROM ahbrp.feature_involvement fi
  JOIN ahbrp.location l
    ON l.feature_pk = fi.feature_pk
  JOIN ahbrp.feature_state fs
    ON fs.feature_pk = fi.feature_pk
  JOIN ahbrp.party_role pr
    ON pr.party_role_pk = fi.party_role_pk
  JOIN ahbrp.party p
    ON p.party_pk = pr.party_pk
  JOIN ahbrp.party_state ps
    ON ps.party_pk = p.party_pk
  WHERE fi.feature_involvement_type = 'CPHHOLDERSHIP'
    AND fi.feature_involv_to_date IS NULL
    AND fs.feature_status_code <> 'INACTIVE'
    AND fs.feature_state_to_dttm IS NULL
    AND pr.party_role_to_date IS NULL
    AND ps.party_status_code <> 'INACTIVE'
    AND ps.party_state_to_dttm IS NULL
),
-- groups of two or more active holderships of one CPH number that share a
-- Vetnet core id, or a location; each group is then described by whether its
-- members have one or several parties, locations, core ids and start dates
shared_group AS (
  SELECT
    'CPH_AND_CORE_ID' AS shared_by,
    COUNT(*) AS holderships,
    COUNT(DISTINCT ah.party_pk) AS parties,
    COUNT(DISTINCT ah.feature_pk) AS locations,
    COUNT(DISTINCT ah.vetnet_core_id) AS core_ids,
    COUNT(DISTINCT ah.feature_involv_from_date) AS from_dates
  FROM active_holdership ah
  GROUP BY ah.cph, ah.vetnet_core_id
  HAVING COUNT(*) > 1
  UNION ALL
  SELECT
    'CPH_AND_LOCATION' AS shared_by,
    COUNT(*) AS holderships,
    COUNT(DISTINCT ah.party_pk) AS parties,
    COUNT(DISTINCT ah.feature_pk) AS locations,
    COUNT(DISTINCT ah.vetnet_core_id) AS core_ids,
    COUNT(DISTINCT ah.feature_involv_from_date) AS from_dates
  FROM active_holdership ah
  GROUP BY ah.cph, ah.feature_pk
  HAVING COUNT(*) > 1
)
SELECT
  sg.shared_by,
  sg.holderships AS holderships_per_group,
  CASE WHEN sg.parties = 1 THEN 'ONE' ELSE 'SEVERAL' END AS parties,
  CASE WHEN sg.locations = 1 THEN 'ONE' ELSE 'SEVERAL' END AS locations,
  CASE WHEN sg.core_ids = 1 THEN 'ONE' ELSE 'SEVERAL' END AS core_ids,
  CASE WHEN sg.from_dates = 1 THEN 'ONE' ELSE 'SEVERAL' END AS from_dates,
  COUNT(*) AS group_count
FROM shared_group sg
GROUP BY
  sg.shared_by,
  sg.holderships,
  CASE WHEN sg.parties = 1 THEN 'ONE' ELSE 'SEVERAL' END,
  CASE WHEN sg.locations = 1 THEN 'ONE' ELSE 'SEVERAL' END,
  CASE WHEN sg.core_ids = 1 THEN 'ONE' ELSE 'SEVERAL' END,
  CASE WHEN sg.from_dates = 1 THEN 'ONE' ELSE 'SEVERAL' END
ORDER BY sg.shared_by, holderships_per_group

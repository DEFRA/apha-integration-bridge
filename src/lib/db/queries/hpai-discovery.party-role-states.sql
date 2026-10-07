WITH current_roles AS (
  SELECT pr.party_role_pk, pr.main_role_type
  FROM ahbrp.party_role pr
  WHERE pr.party_role_to_date IS NULL
),
current_states AS (
  SELECT prs.party_role_pk, prs.party_role_status_code, prs.party_role_state_from_dttm
  FROM ahbrp.party_role_state prs
  WHERE prs.party_role_state_to_dttm IS NULL
)
SELECT
  'STATUS' AS measure,
  cr.main_role_type,
  cs.party_role_status_code AS value,
  COUNT(*) AS total,
  SUM(CASE WHEN cs.party_role_state_from_dttm > SYSTIMESTAMP THEN 1 ELSE 0 END) AS future_dated
FROM current_roles cr
JOIN current_states cs
  ON cs.party_role_pk = cr.party_role_pk
GROUP BY cr.main_role_type, cs.party_role_status_code
UNION ALL
SELECT
  'STATES_PER_ROLE' AS measure,
  main_role_type,
  state_rows AS value,
  COUNT(*) AS total,
  0 AS future_dated
FROM (
  SELECT
    cr.main_role_type,
    CASE
      WHEN COUNT(cs.party_role_pk) = 0 THEN '0'
      WHEN COUNT(cs.party_role_pk) = 1 THEN '1'
      ELSE '2+'
    END AS state_rows
  FROM current_roles cr
  LEFT JOIN current_states cs
    ON cs.party_role_pk = cr.party_role_pk
  GROUP BY cr.party_role_pk, cr.main_role_type
)
GROUP BY main_role_type, state_rows
ORDER BY 1, 2, 4 DESC

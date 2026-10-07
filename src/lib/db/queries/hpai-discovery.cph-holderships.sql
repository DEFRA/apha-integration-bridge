WITH active_holdership AS (
  SELECT
    fi.feature_involvement_pk,
    fi.cph,
    fi.vetnet_core_id,
    fi.feature_pk,
    COUNT(*) AS join_rows
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
  GROUP BY fi.feature_involvement_pk, fi.cph, fi.vetnet_core_id, fi.feature_pk
),
holdership_pair AS (
  SELECT
    ah.feature_involvement_pk,
    ah.cph,
    ah.feature_pk,
    ah.join_rows,
    MAX(CASE WHEN c.cph_pk IS NULL THEN 1 ELSE 0 END) AS unmatched_pair
  FROM active_holdership ah
  LEFT JOIN ahbrp.cph c
    ON c.cph = ah.cph
   AND c.core_id = ah.vetnet_core_id
  GROUP BY ah.feature_involvement_pk, ah.cph, ah.feature_pk, ah.join_rows
),
per_number AS (
  SELECT
    hp.cph,
    SUBSTR(hp.cph, 1, 6) AS county_parish_code,
    COUNT(*) AS holderships,
    COUNT(DISTINCT hp.feature_pk) AS locations,
    SUM(hp.join_rows) AS join_rows,
    SUM(hp.unmatched_pair) AS unmatched_pairs
  FROM holdership_pair hp
  GROUP BY hp.cph, SUBSTR(hp.cph, 1, 6)
),
cph_rows AS (
  SELECT c.cph, COUNT(*) AS cph_rows
  FROM ahbrp.cph c
  GROUP BY c.cph
),
-- find-holding.sql's LOCAL_AUTHORITY CTE, reproduced exactly (date literals
-- included), because today's GET left-joins it and every extra row it
-- returns for a county/parish adds a response row
local_authority_rows AS (
  SELECT rdc1.code AS county_parish_code, COUNT(*) AS la_rows
  FROM ahbrp.ref_data_set_map rdsm
  JOIN ahbrp.ref_data_code_map rdcm
    ON rdsm.ref_data_set_map_pk = rdcm.ref_data_set_map_pk
  JOIN ahbrp.ref_data_code rdc
    ON rdcm.from_ref_data_code_pk = rdc.ref_data_code_pk
  JOIN ahbrp.ref_data_code rdc1
    ON rdcm.to_ref_data_code_pk = rdc1.ref_data_code_pk
  JOIN ahbrp.ref_data_code_desc rdcd
    ON rdc.ref_data_code_pk = rdcd.ref_data_code_pk
  WHERE rdsm.ref_data_set_map_name = 'LOCAL_AUTHORITY_COUNTY_PARISH'
    AND rdsm.effective_to_date = '31/DEC/9999'
    AND rdcm.effective_to_date = '31/DEC/9999'
    AND rdc.effective_to_date = '31/DEC/9999'
    AND rdc1.effective_to_date = '31/DEC/9999'
  GROUP BY rdc1.code
)
SELECT
  pn.holderships,
  COUNT(*) AS cph_numbers,
  SUM(CASE WHEN pn.locations < pn.holderships THEN 1 ELSE 0 END) AS sharing_a_location,
  SUM(CASE WHEN pn.join_rows > pn.holderships THEN 1 ELSE 0 END) AS with_duplicate_state_rows,
  SUM(CASE WHEN cr.cph_rows > 1 THEN 1 ELSE 0 END) AS with_several_cph_rows,
  SUM(CASE WHEN la.la_rows > 1 THEN 1 ELSE 0 END) AS with_several_local_authority_rows,
  SUM(
    CASE
      WHEN pn.join_rows * NVL(cr.cph_rows, 0) * GREATEST(NVL(la.la_rows, 0), 1) > 1 THEN 1
      ELSE 0
    END
  ) AS conflict_today,
  SUM(CASE WHEN cr.cph IS NULL THEN 1 ELSE 0 END) AS without_cph_row,
  SUM(pn.unmatched_pairs) AS holderships_without_matching_pair
FROM per_number pn
LEFT JOIN cph_rows cr
  ON cr.cph = pn.cph
LEFT JOIN local_authority_rows la
  ON la.county_parish_code = pn.county_parish_code
GROUP BY pn.holderships
ORDER BY pn.holderships

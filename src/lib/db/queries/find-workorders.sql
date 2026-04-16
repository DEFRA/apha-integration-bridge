WITH requested_workorders AS (
  SELECT DISTINCT
  ws.pyid work_order_id

  FROM
  pega_Data.index_ac_workschedule ws

  WHERE
  ws.pyid IN (:workorder_ids)
),
ws_entities AS (
  SELECT /*+ MATERIALIZE */
  wsl.pyid,
  wsl.pxindexpurpose,
  wsl.entityid,
  wsl.cphid

  FROM
  pega_Data.index_ac_wsentities wsl,
  requested_workorders rw

  WHERE
  rw.work_order_id = wsl.pyid
  AND
  wsl.pxindexpurpose IN (
    'workScheduleLocation',
    'workScheduleCustomers',
    'workScheduleLivestockUnits',
    'workScheduleFacilities'
  )
),
ws_loc AS (
  SELECT
  pyid,
  entityid,
  cphid

  FROM
  ws_entities

  WHERE
  pxindexpurpose = 'workScheduleLocation'
),
ws_c AS (
  SELECT
  pyid,
  entityid

  FROM
  ws_entities

  WHERE
  pxindexpurpose = 'workScheduleCustomers'
),
ws_lu AS (
  SELECT
  pyid,
  entityid

  FROM
  ws_entities

  WHERE
  pxindexpurpose = 'workScheduleLivestockUnits'
),
ws_f AS (
  SELECT
  pyid,
  entityid

  FROM
  ws_entities

  WHERE
  pxindexpurpose = 'workScheduleFacilities'
),
wsa AS (
  SELECT
  rw.work_order_id ws_id,
  wsa_ac.pyid wsa_id,
  aca.actname activity_name,
  wsa_ac.pystatuswork wsa_status,
  wsa_ac.activitysequencenumber

  FROM
  pega_Data.ahwork_ac wsa_ac,
  pega_data.index_ac_activity aca,
  requested_workorders rw

  WHERE
  wsa_ac.pxinsname = aca.pyid
  AND
  wsa_ac.pydescription IS NULL
  AND
  wsa_ac.pxcoverinskey = 'AH-AC ' || rw.work_order_id
)

SELECT
DISTINCT ws.pyid work_order_id,
ws.purposeworkarea work_area,
ws.purposecountry country,
ws.aimname aim,
ws.businessarea business_area,
ws.purposename purpose,
ws.speciesforpurpose purpose_species,
ac.pystatuswork ws_status,
ws_loc.entityid location_id,
ws_loc.cphid cph,
ws_c.entityid customer_id,
ws_lu.entityid livestock_unit_id,
ws_f.entityid facility_unit_id,
wsa.wsa_id,
wsa.activity_name,
ws.phase,
wsa.activitysequencenumber,
TO_CHAR(ac.wsactivationdate, 'yyyy-mm-dd"T"hh24:mi:ss') wsactivationdate,
TO_CHAR(ac.wsearliestactivitystartdate, 'yyyy-mm-dd"T"hh24:mi:ss') wsearliestactivitystartdate,
TO_CHAR(ac.pysladeadline, 'yyyy-mm-dd"T"hh24:mi:ss') target_date
-- Dates that don't seem to be used at the moment, but may be useful in the future:
-- TO_CHAR(ac.pxupdatedatetime, 'dd/mm/yyyy hh24:mi:ss') updated_date,
-- TO_CHAR(ac.wsstartdate, 'yyyy-mm-dd') wsstartdate,
-- TO_CHAR(ac.wslatestactivitycompletiondate, 'yyyy-mm-dd"T"hh24:mi:ss') wslatestactivitycompletiondate,


FROM
pega_data.ahwork_ac ac,
pega_Data.index_ac_workschedule ws,
requested_workorders rw,
ws_loc,
ws_c,
ws_lu,
ws_f,
wsa

WHERE
ac.pzinskey = ws.pxinsindexedkey
AND
ws.pyid = rw.work_order_id
AND
ac.pyid = ws_loc.pyid (+)
AND
ac.pyid = ws_c.pyid(+)
AND
ac.pyid = ws_lu.pyid(+)
AND
ac.pyid = ws_f.pyid(+)
AND
ws.pyid = wsa.ws_id(+)
AND
ac.pxobjclass = 'AH-AC-WS'

ORDER BY
ws.pyid ASC,
wsa.activitysequencenumber ASC,
wsa.wsa_id ASC

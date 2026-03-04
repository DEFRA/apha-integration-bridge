SELECT
DISTINCT ws.pyid work_order_id,
TO_CHAR(ac.pxupdatedatetime, 'dd/mm/yyyy hh24:mi:ss') updated_date,
ws.purposeworkarea work_area,
ws.purposecountry country,
ws.aimname aim,
ws.businessarea business_area,
ws.purposename purpose,
ws.speciesforpurpose purpose_species,
ac.pystatuswork ws_status,
ac.pysladeadline target_date,
ws_loc.entityid location_id,
ws_loc.cphid cph,
ws_c.entityid customer_id,
ws_lu.entityid livestock_unit_id,
ws_f.entityid facility_unit_id,
wsa.wsa_id,
wsa.activity_name,
ac.wsactivationdate,
ac.wsstartdate,
ac.wsearliestactivitystartdate,
ac.wslatestactivitycompletiondate,
ws.phase,
ac.pysladeadline due_date,
wsa.activitysequencenumber

FROM
pega_data.ahwork_ac ac,
pega_Data.index_ac_workschedule ws,
(
  SELECT
  entityid,
  pyid,
  cphid

  FROM
  pega_Data.index_ac_wsentities wsl

  WHERE
  PXINDEXPURPOSE = 'workScheduleLocation'
) ws_loc,
(
  SELECT
  entityid,
  pyid

  FROM
  pega_Data.index_ac_wsentities wsl

  WHERE
  PXINDEXPURPOSE = 'workScheduleCustomers'
) ws_c,
(
  SELECT
  entityid,
  pyid

  FROM
  pega_Data.index_ac_wsentities wsl

  WHERE
  PXINDEXPURPOSE = 'workScheduleLivestockUnits'
) ws_lu,
(
  SELECT
  entityid,
  pyid

  FROM
  pega_Data.index_ac_wsentities wsl

  WHERE
  PXINDEXPURPOSE = 'workScheduleFacilities'
) ws_f,
(
  SELECT
  SUBSTR(pxcoverinskey, 7) ws_id,
  wsa.pyid wsa_id,
  actname activity_name,
  pystatuswork wsa_status,
  activitysequencenumber

  FROM
  pega_Data.ahwork_ac wsa,
  pega_data.index_ac_activity ac

  WHERE
  wsa.pxinsname = ac.pyid
  AND
  pydescription IS NULL
  AND
  SUBSTR(pxcoverinskey, 6) IS NOT NULL
) wsa

WHERE
ac.pzinskey = ws.pxinsindexedkey
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
AND
ac.pystatuswork IN ('Open')
AND
ws.purposecountry = 'SCOTLAND'
AND
ws.pyid IN ('WS-44', 'WS-302')

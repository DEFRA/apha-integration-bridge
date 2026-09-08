WITH filtered_workorders AS (
  SELECT DISTINCT
    ws.pyid work_order_id,
    ac.wsactivationdate activation_date

  FROM
  pega_data.ahwork_ac ac,
  pega_Data.index_ac_workschedule ws

  WHERE
  ac.pzinskey = ws.pxinsindexedkey
  AND
  ac.pxobjclass = 'AH-AC-WS'
  AND
  ac.pystatuswork IN (__STATUSES__)
  AND
  (:has_countries = 0 OR UPPER(ws.purposecountry) IN (__COUNTRIES__))
  AND
  (
    (:date_type = 'activation' AND ac.wsactivationdate >= TO_TIMESTAMP(:start_date, 'yyyy-mm-dd hh24:mi:ss.ff3') AND ac.wsactivationdate < TO_TIMESTAMP(:end_date, 'yyyy-mm-dd hh24:mi:ss.ff3'))
    OR
    (:date_type = 'updated' AND ac.pxupdatedatetime >= TO_TIMESTAMP(:start_date, 'yyyy-mm-dd hh24:mi:ss.ff3') AND ac.pxupdatedatetime < TO_TIMESTAMP(:end_date, 'yyyy-mm-dd hh24:mi:ss.ff3'))
  )
),
ordered_workorders AS (
  SELECT
  work_order_id,
  ROW_NUMBER() OVER (ORDER BY activation_date ASC, work_order_id ASC) row_num

  FROM
  filtered_workorders
),
requested_workorders AS (
  SELECT
  work_order_id,
  row_num

  FROM
  ordered_workorders

  WHERE
  row_num > :offset_rows
  AND
  row_num <= :offset_rows + :fetch_rows
),

WITH filtered_workorders AS (
  SELECT DISTINCT
  ws.pyid work_order_id

  FROM
  pega_Data.index_ac_workschedule ws

  WHERE
  ws.pyid IN (__WORKORDER_IDS__)
),
requested_workorders AS (
  SELECT
  work_order_id,
  ROW_NUMBER() OVER (ORDER BY work_order_id ASC) row_num

  FROM
  filtered_workorders
),

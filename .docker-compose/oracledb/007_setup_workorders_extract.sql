-- ─────────────────────────────────────────────────────────────────────────────
--  007_setup_workorders_extract.sql
--  Seed data from Work_Schedule_extract_03022026.xlsx for GET /workorders
--  Generated from workbook rows (idempotent MERGE statements).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;

CONNECT pega_data/password@FREEPDB1;

SET DEFINE OFF;

-- Workorder rows
MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-43' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-43', 'AH-AC-WS WS-43', 'AH-AC-WS', TO_DATE('2021-06-17 14:26:46', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2014-05-09', DATE '2014-05-09', TO_TIMESTAMP('2014-05-09 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2014-05-16'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-43' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-43', 'AH-AC-WS WS-43', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-299' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-299', 'AH-AC-WS WS-299', 'AH-AC-WS', TO_DATE('2021-06-17 14:26:44', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2014-06-24', DATE '2014-06-24', TO_TIMESTAMP('2014-06-24 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2015-06-24'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-299' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-299', 'AH-AC-WS WS-299', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'EXEMPT(S) TB Skin Test Exempt (Scotland) - Surveillance', 'CTT', 'SURVLLANCEMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-1027' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-1027', 'AH-AC-WS WS-1027', 'AH-AC-WS', TO_DATE('2021-06-17 14:33:09', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2014-08-03', DATE '2014-08-03', TO_TIMESTAMP('2014-08-03 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2014-08-11'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-1027' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-1027', 'AH-AC-WS WS-1027', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-1531' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-1531', 'AH-AC-WS WS-1531', 'AH-AC-WS', TO_DATE('2021-06-17 14:37:04', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2014-06-29', DATE '2014-08-28', TO_TIMESTAMP('2014-08-28 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2014-11-28'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-1531' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-1531', 'AH-AC-WS WS-1531', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'RHT TB Skin Test - Surveillance 48M', 'CTT', 'SURVLLANCEMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-1526' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-1526', 'AH-AC-WS WS-1526', 'AH-AC-WS', TO_DATE('2021-06-17 14:37:01', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2014-11-28', DATE '2014-11-28', TO_TIMESTAMP('2014-11-28 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2015-11-28'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-1526' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-1526', 'AH-AC-WS WS-1526', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'EXEMPT(S) TB Skin Test Exempt (Scotland) - Surveillance', 'CTT', 'SURVLLANCEMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-1583' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-1583', 'AH-AC-WS WS-1583', 'AH-AC-WS', TO_DATE('2021-06-17 14:37:27', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2014-11-12', DATE '2014-11-12', TO_TIMESTAMP('2014-11-12 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2014-11-19'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-1583' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-1583', 'AH-AC-WS WS-1583', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-1811' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-1811', 'AH-AC-WS WS-1811', 'AH-AC-WS', TO_DATE('2021-06-17 14:38:30', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-01-15', DATE '2015-01-15', TO_TIMESTAMP('2015-01-15 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-01-15'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-1811' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-1811', 'AH-AC-WS WS-1811', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'EXEMPT(S) TB Skin Test Exempt (Scotland) - Surveillance', 'CTT', 'SURVLLANCEMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-2358' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-2358', 'AH-AC-WS WS-2358', 'AH-AC-WS', TO_DATE('2021-06-17 15:13:39', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2014-09-02', DATE '2014-11-01', TO_TIMESTAMP('2014-11-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2014-12-01'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-2358' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-2358', 'AH-AC-WS WS-2358', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'SI TB Skin Test - Investigation & Intervention', 'CTT', 'INVESTIGATINTRVNTION'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-2374' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-2374', 'AH-AC-WS WS-2374', 'AH-AC-WS', TO_DATE('2021-06-17 15:13:52', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-01-02', DATE '2015-01-02', TO_TIMESTAMP('2015-01-02 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2015-02-01'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-2374' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-2374', 'AH-AC-WS WS-2374', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'Overdue TB Test Stage 1 (Non-Surveillance)', 'CTT', 'FOLLOWUP'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-3353' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-3353', 'AH-AC-WS WS-3353', 'AH-AC-WS', TO_DATE('2021-06-17 16:00:06', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-03-16', DATE '2015-03-16', TO_TIMESTAMP('2015-03-16 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2015-03-23'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-3353' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-3353', 'AH-AC-WS WS-3353', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-5533' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-5533', 'AH-AC-WS WS-5533', 'AH-AC-WS', TO_DATE('2021-06-17 16:13:45', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-02-10', DATE '2015-04-11', TO_TIMESTAMP('2015-04-11 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2015-06-11'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-5533' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-5533', 'AH-AC-WS WS-5533', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', '12M TB Skin Test - Enhanced Surveillance 12M', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-5900' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-5900', 'AH-AC-WS WS-5900', 'AH-AC-WS', TO_DATE('2021-06-17 16:20:38', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-06-09', DATE '2015-06-09', TO_TIMESTAMP('2015-06-09 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2015-06-16'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-5900' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-5900', 'AH-AC-WS WS-5900', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRMT TB Skin Test - Enhanced Surveillance PRMT', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-6031' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-6031', 'AH-AC-WS WS-6031', 'AH-AC-WS', TO_DATE('2021-06-17 16:22:08', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-06-21', DATE '2015-06-21', TO_TIMESTAMP('2015-06-21 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2015-06-29'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-6031' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-6031', 'AH-AC-WS WS-6031', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-6666' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-6666', 'AH-AC-WS WS-6666', 'AH-AC-WS', TO_DATE('2025-10-27 08:01:27', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-09-17', DATE '2015-10-08', TO_TIMESTAMP('2015-10-08 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2025-10-08'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-6666' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-6666', 'AH-AC-WS WS-6666', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'Conduct Disease Investigation', 'CTT', 'INVESTIGATINTRVNTION'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-6334' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-6334', 'AH-AC-WS WS-6334', 'AH-AC-WS', TO_DATE('2021-06-17 16:31:14', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-05-25', DATE '2015-07-24', TO_TIMESTAMP('2015-07-24 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2015-09-24'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-6334' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-6334', 'AH-AC-WS WS-6334', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', '12M TB Skin Test - Enhanced Surveillance 12M', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8480' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8480', 'AH-AC-WS WS-8480', 'AH-AC-WS', TO_DATE('2021-06-17 16:55:25', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-01-24', DATE '2016-01-24', TO_TIMESTAMP('2016-01-24 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-02-01'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8480' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8480', 'AH-AC-WS WS-8480', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8481' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8481', 'AH-AC-WS WS-8481', 'AH-AC-WS', TO_DATE('2021-06-17 16:55:25', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-01-24', DATE '2016-01-24', TO_TIMESTAMP('2016-01-24 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-02-01'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8481' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8481', 'AH-AC-WS WS-8481', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8485' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8485', 'AH-AC-WS WS-8485', 'AH-AC-WS', TO_DATE('2021-06-17 16:55:29', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-01-25', DATE '2016-01-25', TO_TIMESTAMP('2016-01-25 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-02-01'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8485' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8485', 'AH-AC-WS WS-8485', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-7844' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-7844', 'AH-AC-WS WS-7844', 'AH-AC-WS', TO_DATE('2015-12-31 11:16:16', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-11-15', DATE '2015-11-15', TO_TIMESTAMP('2015-11-15 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2015-12-05'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-7844' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-7844', 'AH-AC-WS WS-7844', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'Manage Licences', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8501' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8501', 'AH-AC-WS WS-8501', 'AH-AC-WS', TO_DATE('2021-06-17 16:55:40', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-01-25', DATE '2016-01-25', TO_TIMESTAMP('2016-01-25 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-02-01'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8501' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8501', 'AH-AC-WS WS-8501', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8503' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8503', 'AH-AC-WS WS-8503', 'AH-AC-WS', TO_DATE('2021-06-17 16:55:40', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-01-25', DATE '2016-01-25', TO_TIMESTAMP('2016-01-25 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-02-01'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8503' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8503', 'AH-AC-WS WS-8503', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8505' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8505', 'AH-AC-WS WS-8505', 'AH-AC-WS', TO_DATE('2021-06-17 16:55:41', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-01-26', DATE '2016-01-26', TO_TIMESTAMP('2016-01-26 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-02-02'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8505' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8505', 'AH-AC-WS WS-8505', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8468' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8468', 'AH-AC-WS WS-8468', 'AH-AC-WS', TO_DATE('2021-06-17 16:55:15', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-01-24', DATE '2016-01-24', TO_TIMESTAMP('2016-01-24 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-02-01'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8468' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8468', 'AH-AC-WS WS-8468', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8470' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8470', 'AH-AC-WS WS-8470', 'AH-AC-WS', TO_DATE('2021-06-17 16:55:17', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-01-24', DATE '2016-01-24', TO_TIMESTAMP('2016-01-24 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-02-01'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8470' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8470', 'AH-AC-WS WS-8470', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8474' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8474', 'AH-AC-WS WS-8474', 'AH-AC-WS', TO_DATE('2021-06-17 16:55:19', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-01-24', DATE '2016-01-24', TO_TIMESTAMP('2016-01-24 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-02-01'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8474' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8474', 'AH-AC-WS WS-8474', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8476' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8476', 'AH-AC-WS WS-8476', 'AH-AC-WS', TO_DATE('2021-06-17 16:55:21', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-01-24', DATE '2016-01-24', TO_TIMESTAMP('2016-01-24 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-02-01'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8476' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8476', 'AH-AC-WS WS-8476', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8453' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8453', 'AH-AC-WS WS-8453', 'AH-AC-WS', TO_DATE('2021-06-17 16:55:04', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-01-23', DATE '2016-01-23', TO_TIMESTAMP('2016-01-23 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-02-01'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8453' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8453', 'AH-AC-WS WS-8453', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8313' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8313', 'AH-AC-WS WS-8313', 'AH-AC-WS', TO_DATE('2021-06-17 16:54:08', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-12-26', DATE '2015-12-26', TO_TIMESTAMP('2015-12-26 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-01-06'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8313' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8313', 'AH-AC-WS WS-8313', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8318' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8318', 'AH-AC-WS WS-8318', 'AH-AC-WS', TO_DATE('2021-06-17 16:54:10', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-12-26', DATE '2015-12-26', TO_TIMESTAMP('2015-12-26 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-01-06'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8318' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8318', 'AH-AC-WS WS-8318', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8329' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8329', 'AH-AC-WS WS-8329', 'AH-AC-WS', TO_DATE('2021-06-17 16:54:14', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-12-26', DATE '2015-12-26', TO_TIMESTAMP('2015-12-26 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-01-06'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8329' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8329', 'AH-AC-WS WS-8329', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8331' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8331', 'AH-AC-WS WS-8331', 'AH-AC-WS', TO_DATE('2021-06-17 16:54:16', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-12-27', DATE '2015-12-27', TO_TIMESTAMP('2015-12-27 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-01-06'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8331' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8331', 'AH-AC-WS WS-8331', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8465' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8465', 'AH-AC-WS WS-8465', 'AH-AC-WS', TO_DATE('2021-06-17 16:55:12', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-01-24', DATE '2016-01-24', TO_TIMESTAMP('2016-01-24 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-02-01'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8465' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8465', 'AH-AC-WS WS-8465', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8466' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8466', 'AH-AC-WS WS-8466', 'AH-AC-WS', TO_DATE('2021-06-17 16:55:13', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-01-24', DATE '2016-01-24', TO_TIMESTAMP('2016-01-24 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-02-01'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8466' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8466', 'AH-AC-WS WS-8466', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8290' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8290', 'AH-AC-WS WS-8290', 'AH-AC-WS', TO_DATE('2021-06-17 16:53:59', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-12-22', DATE '2015-12-22', TO_TIMESTAMP('2015-12-22 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2015-12-31'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8290' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8290', 'AH-AC-WS WS-8290', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8339' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8339', 'AH-AC-WS WS-8339', 'AH-AC-WS', TO_DATE('2021-06-17 16:54:18', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-12-27', DATE '2015-12-27', TO_TIMESTAMP('2015-12-27 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-01-06'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8339' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8339', 'AH-AC-WS WS-8339', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8341' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8341', 'AH-AC-WS WS-8341', 'AH-AC-WS', TO_DATE('2021-06-17 16:54:19', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-12-27', DATE '2015-12-27', TO_TIMESTAMP('2015-12-27 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-01-06'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8341' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8341', 'AH-AC-WS WS-8341', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8343' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8343', 'AH-AC-WS WS-8343', 'AH-AC-WS', TO_DATE('2021-06-17 16:54:20', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-12-27', DATE '2015-12-27', TO_TIMESTAMP('2015-12-27 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-01-06'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8343' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8343', 'AH-AC-WS WS-8343', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8354' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8354', 'AH-AC-WS WS-8354', 'AH-AC-WS', TO_DATE('2021-06-17 16:54:22', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-12-27', DATE '2015-12-27', TO_TIMESTAMP('2015-12-27 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-01-06'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8354' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8354', 'AH-AC-WS WS-8354', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-7727' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-7727', 'AH-AC-WS WS-7727', 'AH-AC-WS', TO_DATE('2015-12-31 11:09:01', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-11-09', DATE '2015-11-09', TO_TIMESTAMP('2015-11-09 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2015-11-29'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-7727' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-7727', 'AH-AC-WS WS-7727', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'Manage Licences', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8272' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8272', 'AH-AC-WS WS-8272', 'AH-AC-WS', TO_DATE('2021-06-17 16:53:42', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-12-15', DATE '2015-12-15', TO_TIMESTAMP('2015-12-15 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2015-12-22'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8272' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8272', 'AH-AC-WS WS-8272', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8367' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8367', 'AH-AC-WS WS-8367', 'AH-AC-WS', TO_DATE('2021-06-17 16:54:27', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2015-12-28', DATE '2015-12-28', TO_TIMESTAMP('2015-12-28 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-01-06'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8367' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8367', 'AH-AC-WS WS-8367', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8431' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8431', 'AH-AC-WS WS-8431', 'AH-AC-WS', TO_DATE('2021-06-17 16:54:52', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-01-17', DATE '2016-01-17', TO_TIMESTAMP('2016-01-17 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-01-25'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8431' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8431', 'AH-AC-WS WS-8431', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-9539' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-9539', 'AH-AC-WS WS-9539', 'AH-AC-WS', TO_DATE('2021-06-17 17:06:15', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-05-10', DATE '2016-05-10', TO_TIMESTAMP('2016-05-10 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-05-17'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-9539' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-9539', 'AH-AC-WS WS-9539', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-9540' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-9540', 'AH-AC-WS WS-9540', 'AH-AC-WS', TO_DATE('2021-06-17 17:06:16', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-05-10', DATE '2016-05-10', TO_TIMESTAMP('2016-05-10 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-05-17'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-9540' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-9540', 'AH-AC-WS WS-9540', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8617' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8617', 'AH-AC-WS WS-8617', 'AH-AC-WS', TO_DATE('2021-06-17 16:56:40', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-02-24', DATE '2016-02-24', TO_TIMESTAMP('2016-02-24 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-03-02'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8617' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8617', 'AH-AC-WS WS-8617', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8613' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8613', 'AH-AC-WS WS-8613', 'AH-AC-WS', TO_DATE('2021-06-17 16:56:39', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-02-24', DATE '2016-02-24', TO_TIMESTAMP('2016-02-24 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-03-02'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8613' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8613', 'AH-AC-WS WS-8613', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-8547' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-8547', 'AH-AC-WS WS-8547', 'AH-AC-WS', TO_DATE('2021-06-17 16:55:52', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2016-02-01', DATE '2016-02-01', TO_TIMESTAMP('2016-02-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2016-02-08'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-8547' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-8547', 'AH-AC-WS WS-8547', 'TB', 'SCOTLAND', 'Contain / Control / Eradicate Endemic Disease',
    'Endemic Notifiable Disease', 'VE-PRI TB Skin Test - Private (Non PRMT) - Enhanced Surveillance', 'CTT', 'ENHANCEDMONITORING'
  );

-- Relationship entities
MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-43' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-43', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-43' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-43', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-43' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1004666' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1004666', 'WS-43', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-299' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-299', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-299' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-299', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-299' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1004666' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1004666', 'WS-299', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-1027' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-1027', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-1027' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-1027', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-1027' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005125' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005125', 'WS-1027', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-1531' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-1531', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-1531' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-1531', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-1531' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005109' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005109', 'WS-1531', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-1526' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-1526', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-1526' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-1526', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-1526' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005109' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005109', 'WS-1526', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-1583' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-1583', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-1583' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-1583', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-1583' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005109' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005109', 'WS-1583', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-1811' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1005134' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1005134', 'WS-1811', 'workScheduleLocation', '07/204/6008');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-1811' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1013077' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1013077', 'WS-1811', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-1811' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005095' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005095', 'WS-1811', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-2358' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L36104' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L36104', 'WS-2358', 'workScheduleLocation', '76/348/0005');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-2358' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C5835' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C5835', 'WS-2358', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-2358' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U165583' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U165583', 'WS-2358', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-2374' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L111731' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L111731', 'WS-2374', 'workScheduleLocation', '52/078/0012');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-2374' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C120706' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C120706', 'WS-2374', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-2374' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U98574' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U98574', 'WS-2374', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-3353' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-3353', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-3353' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-3353', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-3353' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-3353', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-5533' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1005259' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1005259', 'WS-5533', 'workScheduleLocation', '79/440/8500');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-5533' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1013257' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1013257', 'WS-5533', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-5533' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005226' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005226', 'WS-5533', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-5900' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-5900', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-5900' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-5900', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-5900' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-5900', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-6031' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-6031', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-6031' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-6031', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-6031' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005125' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005125', 'WS-6031', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-6666' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1005259' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1005259', 'WS-6666', 'workScheduleLocation', '79/440/8500');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-6666' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1013257' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1013257', 'WS-6666', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-6666' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005226' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005226', 'WS-6666', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-6334' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1005293' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1005293', 'WS-6334', 'workScheduleLocation', '07/204/6031');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-6334' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1013299' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1013299', 'WS-6334', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-6334' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005271' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005271', 'WS-6334', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8480' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8480', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8480' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8480', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8480' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8480', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8481' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8481', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8481' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8481', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8481' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8481', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8485' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8485', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8485' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8485', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8485' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8485', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-7844' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L77167' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L77167', 'WS-7844', 'workScheduleLocation', '14/159/0112');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-7844' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C88831' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C88831', 'WS-7844', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-7844' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1004611' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1004611', 'WS-7844', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8501' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8501', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8501' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8501', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8501' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8501', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8503' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8503', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8503' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8503', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8503' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8503', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8505' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8505', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8505' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8505', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8505' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8505', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8468' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8468', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8468' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8468', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8468' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8468', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8470' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8470', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8470' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8470', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8470' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8470', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8474' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8474', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8474' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8474', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8474' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8474', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8476' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8476', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8476' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8476', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8476' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8476', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8453' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8453', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8453' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8453', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8453' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8453', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8313' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8313', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8313' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8313', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8313' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8313', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8318' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8318', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8318' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8318', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8318' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8318', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8329' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8329', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8329' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8329', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8329' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8329', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8331' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8331', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8331' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8331', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8331' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8331', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8465' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8465', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8465' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8465', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8465' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8465', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8466' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8466', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8466' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8466', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8466' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8466', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8290' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8290', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8290' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8290', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8290' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8290', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8339' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8339', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8339' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8339', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8339' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8339', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8341' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8341', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8341' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8341', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8341' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8341', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8343' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8343', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8343' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8343', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8343' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8343', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8354' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8354', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8354' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8354', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8354' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8354', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-7727' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L153344' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L153344', 'WS-7727', 'workScheduleLocation', '66/053/0218');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-7727' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C103406' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C103406', 'WS-7727', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-7727' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005026' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005026', 'WS-7727', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8272' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8272', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8272' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8272', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8272' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8272', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8367' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8367', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8367' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8367', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8367' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8367', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8431' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8431', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8431' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8431', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8431' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005110' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005110', 'WS-8431', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-9539' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-9539', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-9539' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-9539', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-9539' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005124' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005124', 'WS-9539', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-9540' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-9540', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-9540' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-9540', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-9540' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005124' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005124', 'WS-9540', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8617' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8617', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8617' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8617', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8617' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005124' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005124', 'WS-8617', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8613' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8613', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8613' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8613', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8613' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005124' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005124', 'WS-8613', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8547' pyid,
  'workScheduleLocation' pxindexpurpose,
  'L1004758' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('L1004758', 'WS-8547', 'workScheduleLocation', '07/094/0117');

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8547' pyid,
  'workScheduleCustomers' pxindexpurpose,
  'C1012528' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('C1012528', 'WS-8547', 'workScheduleCustomers', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT
  'WS-8547' pyid,
  'workScheduleLivestockUnits' pxindexpurpose,
  'U1005124' entityid
FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1005124', 'WS-8547', 'workScheduleLivestockUnits', NULL);

-- Activity rows
MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-91' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-91', 'AH-AC-WS-ACT WSA-91', 'activity-wsa-91', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-43', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-91' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-91', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-580' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-580', 'AH-AC-WS-ACT WSA-580', 'activity-wsa-580', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-299', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-580' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-580', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-2118' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-2118', 'AH-AC-WS-ACT WSA-2118', 'activity-wsa-2118', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-1027', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-2118' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-2118', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-3124' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-3124', 'AH-AC-WS-ACT WSA-3124', 'activity-wsa-3124', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-1531', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-3124' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-3124', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-3115' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-3115', 'AH-AC-WS-ACT WSA-3115', 'activity-wsa-3115', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-1526', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-3115' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-3115', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-3278' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-3278', 'AH-AC-WS-ACT WSA-3278', 'activity-wsa-3278', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-1583', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-3278' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-3278', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-3710' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-3710', 'AH-AC-WS-ACT WSA-3710', 'activity-wsa-3710', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-1811', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-3710' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-3710', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-3711' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-3711', 'AH-AC-WS-ACT WSA-3711', 'activity-wsa-3711', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-1811', 2
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-3711' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-3711', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-5113' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-5113', 'AH-AC-WS-ACT WSA-5113', 'activity-wsa-5113', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-2358', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-5113' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-5113', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-5147' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-5147', 'AH-AC-WS-ACT WSA-5147', 'activity-wsa-5147', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-2374', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-5147' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-5147', 'Issue 1st Warning Letter');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-7203' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-7203', 'AH-AC-WS-ACT WSA-7203', 'activity-wsa-7203', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-3353', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-7203' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-7203', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-11889' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-11889', 'AH-AC-WS-ACT WSA-11889', 'activity-wsa-11889', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-5533', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-11889' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-11889', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-12735' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-12735', 'AH-AC-WS-ACT WSA-12735', 'activity-wsa-12735', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-5900', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-12735' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-12735', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-13005' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-13005', 'AH-AC-WS-ACT WSA-13005', 'activity-wsa-13005', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-6031', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-13005' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-13005', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-14379' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-14379', 'AH-AC-WS-ACT WSA-14379', 'activity-wsa-14379', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-6666', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-14379' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-14379', 'DRF Follow-on Procedures');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-13680' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-13680', 'AH-AC-WS-ACT WSA-13680', 'activity-wsa-13680', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-6334', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-13680' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-13680', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-18013' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-18013', 'AH-AC-WS-ACT WSA-18013', 'activity-wsa-18013', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8480', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-18013' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-18013', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-18015' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-18015', 'AH-AC-WS-ACT WSA-18015', 'activity-wsa-18015', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8481', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-18015' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-18015', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-18023' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-18023', 'AH-AC-WS-ACT WSA-18023', 'activity-wsa-18023', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8485', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-18023' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-18023', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-16463' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-16463', 'AH-AC-WS-ACT WSA-16463', 'activity-wsa-16463', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-7844', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-16463' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-16463', 'Capture Movement Licence Data');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-18053' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-18053', 'AH-AC-WS-ACT WSA-18053', 'activity-wsa-18053', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8501', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-18053' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-18053', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-18057' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-18057', 'AH-AC-WS-ACT WSA-18057', 'activity-wsa-18057', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8503', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-18057' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-18057', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-18059' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-18059', 'AH-AC-WS-ACT WSA-18059', 'activity-wsa-18059', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8505', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-18059' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-18059', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17989' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17989', 'AH-AC-WS-ACT WSA-17989', 'activity-wsa-17989', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8468', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17989' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17989', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17992' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17992', 'AH-AC-WS-ACT WSA-17992', 'activity-wsa-17992', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8470', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17992' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17992', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-18000' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-18000', 'AH-AC-WS-ACT WSA-18000', 'activity-wsa-18000', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8474', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-18000' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-18000', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-18004' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-18004', 'AH-AC-WS-ACT WSA-18004', 'activity-wsa-18004', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8476', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-18004' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-18004', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17960' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17960', 'AH-AC-WS-ACT WSA-17960', 'activity-wsa-17960', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8453', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17960' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17960', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17692' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17692', 'AH-AC-WS-ACT WSA-17692', 'activity-wsa-17692', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8313', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17692' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17692', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17697' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17697', 'AH-AC-WS-ACT WSA-17697', 'activity-wsa-17697', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8318', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17697' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17697', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17713' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17713', 'AH-AC-WS-ACT WSA-17713', 'activity-wsa-17713', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8329', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17713' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17713', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17718' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17718', 'AH-AC-WS-ACT WSA-17718', 'activity-wsa-17718', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8331', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17718' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17718', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17983' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17983', 'AH-AC-WS-ACT WSA-17983', 'activity-wsa-17983', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8465', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17983' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17983', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17984' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17984', 'AH-AC-WS-ACT WSA-17984', 'activity-wsa-17984', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8466', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17984' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17984', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17659' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17659', 'AH-AC-WS-ACT WSA-17659', 'activity-wsa-17659', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8290', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17659' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17659', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17729' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17729', 'AH-AC-WS-ACT WSA-17729', 'activity-wsa-17729', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8339', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17729' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17729', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17732' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17732', 'AH-AC-WS-ACT WSA-17732', 'activity-wsa-17732', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8341', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17732' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17732', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17733' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17733', 'AH-AC-WS-ACT WSA-17733', 'activity-wsa-17733', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8341', 2
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17733' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17733', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17737' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17737', 'AH-AC-WS-ACT WSA-17737', 'activity-wsa-17737', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8343', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17737' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17737', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17750' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17750', 'AH-AC-WS-ACT WSA-17750', 'activity-wsa-17750', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8354', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17750' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17750', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-16327' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-16327', 'AH-AC-WS-ACT WSA-16327', 'activity-wsa-16327', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-7727', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-16327' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-16327', 'Capture Movement Licence Data');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17624' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17624', 'AH-AC-WS-ACT WSA-17624', 'activity-wsa-17624', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8272', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17624' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17624', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17783' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17783', 'AH-AC-WS-ACT WSA-17783', 'activity-wsa-17783', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8367', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17783' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17783', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-17922' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-17922', 'AH-AC-WS-ACT WSA-17922', 'activity-wsa-17922', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8431', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-17922' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-17922', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-20703' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-20703', 'AH-AC-WS-ACT WSA-20703', 'activity-wsa-20703', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-9539', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-20703' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-20703', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-20704' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-20704', 'AH-AC-WS-ACT WSA-20704', 'activity-wsa-20704', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-9540', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-20704' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-20704', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-18310' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-18310', 'AH-AC-WS-ACT WSA-18310', 'activity-wsa-18310', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8617', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-18310' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-18310', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-18298' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-18298', 'AH-AC-WS-ACT WSA-18298', 'activity-wsa-18298', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8613', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-18298' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-18298', 'Perform TB Skin Test');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-18299' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-18299', 'AH-AC-WS-ACT WSA-18299', 'activity-wsa-18299', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8613', 2
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-18299' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-18299', 'Review Skin Test Results');

MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WSA-18144' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
  VALUES (
    'WSA-18144', 'AH-AC-WS-ACT WSA-18144', 'activity-wsa-18144', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-8547', 1
  );

MERGE INTO pega_data.index_ac_activity t
USING (SELECT 'activity-wsa-18144' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (pyid, actname)
  VALUES ('activity-wsa-18144', 'Perform TB Skin Test');

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
--  008_setup_workorders_livestock_ordering.sql
--  Seed data mirroring 6 workorders from the dev environment that exposed
--  livestock-unit ordering inconsistency between GET /workorders and
--  POST /workorders/find (see Linear DSFAAP "Livestock units ordering
--  inconsistent between GET and POST /find endpoints").
--
--  Workorder IDs and livestock unit IDs match the dev environment exactly.
--  Activation/updated dates are shifted to 2026-01-01..2026-01-06 to keep
--  this fixture isolated from existing test date windows.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;

CONNECT pega_data/password@FREEPDB1;

SET DEFINE OFF;

-- ─────────────────────────────────────────────────────────────────────────────
-- WS-74193: 2 livestock units (U9629, U104354) — natural-PK order != ASC sort
-- ─────────────────────────────────────────────────────────────────────────────
MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-74193' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-74193', 'AH-AC-WS WS-74193', 'AH-AC-WS',
    TO_DATE('2026-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2026-01-01', DATE '2026-01-01',
    TO_TIMESTAMP('2026-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2026-01-08'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-74193' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-74193', 'AH-AC-WS WS-74193', 'Welfare', 'WALES',
    'Protect The Welfare Of Farmed Animals', 'Welfare',
    'M/F Welfare Non Visit', 'Not Required', 'ENHANCEDMONITORING'
  );

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT 'WS-74193' pyid, 'workScheduleLivestockUnits' pxindexpurpose, 'U9629' entityid FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U9629', 'WS-74193', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT 'WS-74193' pyid, 'workScheduleLivestockUnits' pxindexpurpose, 'U104354' entityid FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U104354', 'WS-74193', 'workScheduleLivestockUnits', NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- WS-76465: 3 livestock units (U1000004, U1000015, U1000017)
-- ─────────────────────────────────────────────────────────────────────────────
MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-76465' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-76465', 'AH-AC-WS WS-76465', 'AH-AC-WS',
    TO_DATE('2026-01-02 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2026-01-02', DATE '2026-01-02',
    TO_TIMESTAMP('2026-01-02 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2026-01-09'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-76465' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-76465', 'AH-AC-WS WS-76465', 'TB', 'ENGLAND',
    'Contain / Control / Eradicate Endemic Disease', 'Endemic Notifiable Disease',
    'TB Skin Test', 'CTT', 'SURVLLANCEMONITORING'
  );

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT 'WS-76465' pyid, 'workScheduleLivestockUnits' pxindexpurpose, 'U1000017' entityid FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1000017', 'WS-76465', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT 'WS-76465' pyid, 'workScheduleLivestockUnits' pxindexpurpose, 'U1000015' entityid FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1000015', 'WS-76465', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT 'WS-76465' pyid, 'workScheduleLivestockUnits' pxindexpurpose, 'U1000004' entityid FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1000004', 'WS-76465', 'workScheduleLivestockUnits', NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- WS-76529: 2 livestock units (U27318, U122258) — numeric vs lexical order differ
-- ─────────────────────────────────────────────────────────────────────────────
MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-76529' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-76529', 'AH-AC-WS WS-76529', 'AH-AC-WS',
    TO_DATE('2026-01-03 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2026-01-03', DATE '2026-01-03',
    TO_TIMESTAMP('2026-01-03 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2026-01-10'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-76529' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-76529', 'AH-AC-WS WS-76529', 'TB', 'ENGLAND',
    'Contain / Control / Eradicate Endemic Disease', 'Endemic Notifiable Disease',
    'TB Skin Test', 'CTT', 'SURVLLANCEMONITORING'
  );

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT 'WS-76529' pyid, 'workScheduleLivestockUnits' pxindexpurpose, 'U27318' entityid FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U27318', 'WS-76529', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT 'WS-76529' pyid, 'workScheduleLivestockUnits' pxindexpurpose, 'U122258' entityid FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U122258', 'WS-76529', 'workScheduleLivestockUnits', NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- WS-76655: 2 livestock units (U1006993, U1006994)
-- ─────────────────────────────────────────────────────────────────────────────
MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-76655' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-76655', 'AH-AC-WS WS-76655', 'AH-AC-WS',
    TO_DATE('2026-01-04 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2026-01-04', DATE '2026-01-04',
    TO_TIMESTAMP('2026-01-04 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2026-01-11'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-76655' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-76655', 'AH-AC-WS WS-76655', 'TB', 'ENGLAND',
    'Contain / Control / Eradicate Endemic Disease', 'Endemic Notifiable Disease',
    'TB Skin Test', 'CTT', 'SURVLLANCEMONITORING'
  );

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT 'WS-76655' pyid, 'workScheduleLivestockUnits' pxindexpurpose, 'U1006994' entityid FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1006994', 'WS-76655', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT 'WS-76655' pyid, 'workScheduleLivestockUnits' pxindexpurpose, 'U1006993' entityid FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1006993', 'WS-76655', 'workScheduleLivestockUnits', NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- WS-76657: 2 livestock units (U1006993, U1006994)
-- ─────────────────────────────────────────────────────────────────────────────
MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-76657' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-76657', 'AH-AC-WS WS-76657', 'AH-AC-WS',
    TO_DATE('2026-01-05 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2026-01-05', DATE '2026-01-05',
    TO_TIMESTAMP('2026-01-05 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2026-01-12'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-76657' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-76657', 'AH-AC-WS WS-76657', 'TB', 'ENGLAND',
    'Contain / Control / Eradicate Endemic Disease', 'Endemic Notifiable Disease',
    'TB Skin Test', 'CTT', 'SURVLLANCEMONITORING'
  );

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT 'WS-76657' pyid, 'workScheduleLivestockUnits' pxindexpurpose, 'U1006994' entityid FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1006994', 'WS-76657', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT 'WS-76657' pyid, 'workScheduleLivestockUnits' pxindexpurpose, 'U1006993' entityid FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1006993', 'WS-76657', 'workScheduleLivestockUnits', NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- WS-76724: 2 livestock units (U1007043, U1007044)
-- ─────────────────────────────────────────────────────────────────────────────
MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-76724' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-76724', 'AH-AC-WS WS-76724', 'AH-AC-WS',
    TO_DATE('2026-01-06 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2026-01-06', DATE '2026-01-06',
    TO_TIMESTAMP('2026-01-06 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2026-01-13'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-76724' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-76724', 'AH-AC-WS WS-76724', 'TB', 'ENGLAND',
    'Contain / Control / Eradicate Endemic Disease', 'Endemic Notifiable Disease',
    'TB Skin Test', 'CTT', 'SURVLLANCEMONITORING'
  );

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT 'WS-76724' pyid, 'workScheduleLivestockUnits' pxindexpurpose, 'U1007044' entityid FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1007044', 'WS-76724', 'workScheduleLivestockUnits', NULL);

MERGE INTO pega_data.index_ac_wsentities t
USING (SELECT 'WS-76724' pyid, 'workScheduleLivestockUnits' pxindexpurpose, 'U1007043' entityid FROM dual) s
ON (t.pyid = s.pyid AND t.pxindexpurpose = s.pxindexpurpose AND t.entityid = s.entityid)
WHEN NOT MATCHED THEN
  INSERT (entityid, pyid, pxindexpurpose, cphid)
  VALUES ('U1007043', 'WS-76724', 'workScheduleLivestockUnits', NULL);

COMMIT;

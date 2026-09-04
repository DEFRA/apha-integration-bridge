-- ─────────────────────────────────────────────────────────────────────────────
--  009_setup_workorders_blank_workarea.sql
--  A workorder with no work area and no species (DSFAAP-2806) next to an
--  ordinary one, so a page mixing the two can be tested on both
--  GET /workorders and POST /workorders/find. The SAM code lookups used to be
--  handed the nulls and threw, turning the whole page into a 500.
--
--  Activation/updated dates sit in September 2026 to keep this fixture out of
--  the date windows the other tests use.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;

CONNECT pega_data/password@FREEPDB1;

SET DEFINE OFF;

-- ─────────────────────────────────────────────────────────────────────────────
-- WS-2806: no work area, no species
-- ─────────────────────────────────────────────────────────────────────────────
MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-2806' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-2806', 'AH-AC-WS WS-2806', 'AH-AC-WS',
    TO_DATE('2026-09-02 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2026-09-02', DATE '2026-09-02',
    TO_TIMESTAMP('2026-09-02 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2026-09-09'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-2806' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-2806', 'AH-AC-WS WS-2806', NULL, 'ENGLAND',
    'Protect The Welfare Of Farmed Animals', 'Welfare',
    'M/F Welfare Non Visit', NULL, 'ENHANCEDMONITORING'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- WS-2807: an ordinary workorder on the same page (TB / Cattle)
-- ─────────────────────────────────────────────────────────────────────────────
MERGE INTO pega_data.ahwork_ac t
USING (SELECT 'WS-2807' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
    wsactivationdate, wsstartdate, wsearliestactivitystartdate,
    wslatestactivitycompletiondate, pysladeadline
  ) VALUES (
    'WS-2807', 'AH-AC-WS WS-2807', 'AH-AC-WS',
    TO_DATE('2026-09-03 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Open',
    DATE '2026-09-03', DATE '2026-09-03',
    TO_TIMESTAMP('2026-09-03 00:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    NULL, DATE '2026-09-10'
  );

MERGE INTO pega_data.index_ac_workschedule t
USING (SELECT 'WS-2807' pyid FROM dual) s
ON (t.pyid = s.pyid)
WHEN NOT MATCHED THEN
  INSERT (
    pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
    businessarea, purposename, speciesforpurpose, phase
  ) VALUES (
    'WS-2807', 'AH-AC-WS WS-2807', 'TB', 'ENGLAND',
    'Contain / Control / Eradicate Endemic Disease', 'Endemic Notifiable Disease',
    'TB Skin Test', 'CTT', 'SURVLLANCEMONITORING'
  );

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
--  006_setup_workorders_pega.sql
--  Seed data for POST /workorders/find endpoint (PEGA SCHEMA)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;

-- ─────────────────────────────────────────────────────────────────────────────
-- Create PEGA_DATA schema if it doesn't exist
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN
  EXECUTE IMMEDIATE 'CREATE USER pega_data IDENTIFIED BY "password"';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE = -1920 THEN NULL; -- User already exists
  ELSE RAISE;
  END IF;
END;
/

GRANT CONNECT, RESOURCE, DBA TO pega_data;
/

-- Connect as pega_data user
CONNECT pega_data/password@FREEPDB1;

-- ─────────────────────────────────────────────────────────────────────────────
-- Drop existing tables if they exist (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN EXECUTE IMMEDIATE 'DROP TABLE index_ac_activity PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE index_ac_wsentities PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE index_ac_workschedule PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ahwork_ac PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- Create Pega tables based on find-workorders.sql query structure
-- ─────────────────────────────────────────────────────────────────────────────

-- Main work order table (AHWORK_AC)
CREATE TABLE ahwork_ac (
  pyid                              VARCHAR2(50)  PRIMARY KEY,  -- Work order ID (e.g., 'WS-76512')
  pzinskey                          VARCHAR2(200) NOT NULL,     -- Instance key
  pxinsname                         VARCHAR2(200),              -- Instance name
  pxobjclass                        VARCHAR2(100) NOT NULL,     -- Object class (e.g., 'AH-AC-WS')
  pxupdatedatetime                  DATE,                       -- Last updated
  pystatuswork                      VARCHAR2(50),               -- Status (e.g., 'Open', 'Closed')
  wsactivationdate                  DATE,                       -- Activation date
  wsstartdate                       DATE,                       -- Start date
  wsearliestactivitystartdate       TIMESTAMP,                  -- Earliest activity start
  wslatestactivitycompletiondate    DATE,                       -- Latest activity completion
  pysladeadline                     DATE,                       -- SLA deadline
  pxcoverinskey                     VARCHAR2(200),              -- Cover instance key (for activities)
  pydescription                     VARCHAR2(500)               -- Description
);

-- Work schedule index table (denormalized Pega structure)
CREATE TABLE index_ac_workschedule (
  pyid                  VARCHAR2(50)  NOT NULL,       -- Work order ID
  pxinsindexedkey       VARCHAR2(200) PRIMARY KEY,    -- Indexed key (links to ahwork_ac.pzinskey)
  purposeworkarea       VARCHAR2(100),                -- Work area (e.g., 'Tuberculosis')
  purposecountry        VARCHAR2(50),                 -- Country
  aimname               VARCHAR2(500),                -- Aim
  businessarea          VARCHAR2(100),                -- Business area
  purposename           VARCHAR2(500),                -- Purpose
  speciesforpurpose     VARCHAR2(50),                 -- Species
  phase                 VARCHAR2(50)                  -- Phase
);

-- Entities table (handles locations, customers, livestock units, facilities)
CREATE TABLE index_ac_wsentities (
  entityid          VARCHAR2(50)  NOT NULL,   -- Entity ID (location_id, customer_id, etc.)
  pyid              VARCHAR2(50)  NOT NULL,   -- Work order ID
  pxindexpurpose    VARCHAR2(100) NOT NULL,   -- Purpose flag determines entity type
  cphid             VARCHAR2(50),             -- CPH ID (for locations)
  CONSTRAINT pk_wsentities PRIMARY KEY (pyid, pxindexpurpose, entityid)
);

-- Activity index table
CREATE TABLE index_ac_activity (
  pyid                      VARCHAR2(50)  PRIMARY KEY,  -- Activity ID
  actname                   VARCHAR2(255) NOT NULL,     -- Activity name
  activitysequencenumber    NUMBER,                     -- Sequence number
  pydescription             VARCHAR2(500)               -- Description
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Create indexes for performance
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_ahwork_pyid ON ahwork_ac (pyid)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_ahwork_status ON ahwork_ac (pystatuswork)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_ws_pyid ON index_ac_workschedule (pyid)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_ws_country ON index_ac_workschedule (purposecountry)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_wse_pyid ON index_ac_wsentities (pyid)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_wse_purpose ON index_ac_wsentities (pxindexpurpose)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed data: Work Orders (matching the 9 work orders from original seed)
-- ─────────────────────────────────────────────────────────────────────────────

-- WS-76512: England, Cattle, Empty relationships
INSERT INTO ahwork_ac (
  pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
  wsactivationdate, wsstartdate, wsearliestactivitystartdate,
  wslatestactivitycompletiondate, pysladeadline
) VALUES (
  'WS-76512', 'AH-AC-WS WS-76512', 'AH-AC-WS',
  DATE '2024-01-06', 'Open',
  DATE '2024-01-07', DATE '2024-01-08',
  TIMESTAMP '2024-01-01 09:00:00', NULL,
  DATE '2024-01-15'
);

INSERT INTO index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-76512', 'AH-AC-WS WS-76512', 'Tuberculosis', 'England',
  'Contain / Control / Eradicate Endemic Disease',
  'Endemic Notifiable Disease',
  'Initiate Incident Premises Spread Tracing Action',
  'Cattle', 'EXPOSURETRACKING'
);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('C123456', 'WS-76512', 'workScheduleCustomers', NULL);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('LOC-ALPHA', 'WS-76512', 'workScheduleLocation', '01/001/0001');

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000010', 'WS-76512', 'workScheduleLivestockUnits', NULL);

-- WS-76513: Scotland, Sheep, Mixed relationships (1 livestock + 1 facility)
INSERT INTO ahwork_ac (
  pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
  wsactivationdate, wsstartdate, wsearliestactivitystartdate,
  wslatestactivitycompletiondate, pysladeadline
) VALUES (
  'WS-76513', 'AH-AC-WS WS-76513', 'AH-AC-WS',
  DATE '2024-01-06', 'Open',
  DATE '2024-01-06', DATE '2024-01-06',
  TIMESTAMP '2024-01-03 09:00:00', NULL,
  DATE '2024-01-16'
);

INSERT INTO index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-76513', 'AH-AC-WS WS-76513', 'Tuberculosis', 'Scotland',
  'Contain / Control / Eradicate Endemic Disease',
  'Endemic Notifiable Disease',
  'Initiate Incident Premises Spread Tracing Action',
  'Sheep', 'EXPOSURETRACKING'
);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('O123456', 'WS-76513', 'workScheduleCustomers', NULL);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('LOC-BETA', 'WS-76513', 'workScheduleLocation', '45/001/0002');

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000020', 'WS-76513', 'workScheduleLivestockUnits', NULL);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000030', 'WS-76513', 'workScheduleFacilities', NULL);

-- Activities for WS-76513
INSERT INTO ahwork_ac (
  pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey
) VALUES (
  'WS-76513-ACT1', 'AH-AC-WS-ACT WS-76513-ACT1', 'activity-1',
  'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-76513'
);

INSERT INTO index_ac_activity (pyid, actname, activitysequencenumber)
VALUES ('activity-1', 'Arrange Visit', 1);

INSERT INTO ahwork_ac (
  pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey
) VALUES (
  'WS-76513-ACT2', 'AH-AC-WS-ACT WS-76513-ACT2', 'activity-2',
  'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-76513'
);

INSERT INTO index_ac_activity (pyid, actname, activitysequencenumber)
VALUES ('activity-2', 'Perform TB Skin Test', 2);

-- WS-76514: Wales, Multiple livestock units (2)
INSERT INTO ahwork_ac (
  pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
  wsactivationdate, wsstartdate, wsearliestactivitystartdate,
  wslatestactivitycompletiondate, pysladeadline
) VALUES (
  'WS-76514', 'AH-AC-WS WS-76514', 'AH-AC-WS',
  DATE '2024-02-10', 'Open',
  DATE '2024-02-10', DATE '2024-02-10',
  TIMESTAMP '2024-02-08 08:00:00', NULL,
  DATE '2024-02-20'
);

INSERT INTO index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-76514', 'AH-AC-WS WS-76514', 'General Inspection', 'Wales',
  'Ensure Compliance with Animal Health Standards',
  'Animal Health and Welfare',
  'Routine Inspection and Disease Monitoring',
  'Cattle', 'INSPECTION'
);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('C789012', 'WS-76514', 'workScheduleCustomers', NULL);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('LOC-OMEGA', 'WS-76514', 'workScheduleLocation', '01/409/1111');

-- Multiple livestock units
INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000010', 'WS-76514', 'workScheduleLivestockUnits', NULL);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000020', 'WS-76514', 'workScheduleLivestockUnits', NULL);

-- Activities for WS-76514 (3 activities)
INSERT INTO ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey)
VALUES ('WS-76514-ACT1', 'AH-AC-WS-ACT WS-76514-ACT1', 'activity-3', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-76514');

INSERT INTO index_ac_activity (pyid, actname, activitysequencenumber)
VALUES ('activity-3', 'Initial Farm Assessment', 1);

INSERT INTO ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey)
VALUES ('WS-76514-ACT2', 'AH-AC-WS-ACT WS-76514-ACT2', 'activity-4', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-76514');

INSERT INTO index_ac_activity (pyid, actname, activitysequencenumber)
VALUES ('activity-4', 'Livestock Document Review', 2);

INSERT INTO ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey)
VALUES ('WS-76514-ACT3', 'AH-AC-WS-ACT WS-76514-ACT3', 'activity-5', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-76514');

INSERT INTO index_ac_activity (pyid, actname, activitysequencenumber)
VALUES ('activity-5', 'Physical Animal Inspection', 3);

-- WS-76515: England, Multiple livestock (2) + facility (1)
INSERT INTO ahwork_ac (
  pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
  wsactivationdate, wsstartdate, wsearliestactivitystartdate,
  wslatestactivitycompletiondate, pysladeadline
) VALUES (
  'WS-76515', 'AH-AC-WS WS-76515', 'AH-AC-WS',
  DATE '2024-03-15', 'Open',
  DATE '2024-03-15', DATE '2024-03-15',
  TIMESTAMP '2024-03-12 09:00:00', NULL,
  DATE '2024-03-25'
);

INSERT INTO index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-76515', 'AH-AC-WS WS-76515', 'Movement Controls', 'England',
  'Prevent Disease Spread Through Movement',
  'Trade and Movement',
  'Post-Movement Testing and Facility Inspection',
  'Sheep', 'POSTMOVEMENT'
);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('O456789', 'WS-76515', 'workScheduleCustomers', NULL);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('LOC-ALPHA', 'WS-76515', 'workScheduleLocation', '01/001/0001');

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000010', 'WS-76515', 'workScheduleLivestockUnits', NULL);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000020', 'WS-76515', 'workScheduleLivestockUnits', NULL);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000030', 'WS-76515', 'workScheduleFacilities', NULL);

-- Activities for WS-76515
INSERT INTO ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey)
VALUES ('WS-76515-ACT1', 'AH-AC-WS-ACT WS-76515-ACT1', 'activity-6', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-76515');

INSERT INTO index_ac_activity (pyid, actname, activitysequencenumber)
VALUES ('activity-6', 'Verify Movement Documentation', 1);

INSERT INTO ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey)
VALUES ('WS-76515-ACT2', 'AH-AC-WS-ACT WS-76515-ACT2', 'activity-7', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-76515');

INSERT INTO index_ac_activity (pyid, actname, activitysequencenumber)
VALUES ('activity-7', 'Inspect Holding Facilities', 2);

-- WS-76516: Northern Ireland, NULL relationships
INSERT INTO ahwork_ac (
  pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
  wsactivationdate, wsstartdate, wsearliestactivitystartdate,
  wslatestactivitycompletiondate, pysladeadline
) VALUES (
  'WS-76516', 'AH-AC-WS WS-76516', 'AH-AC-WS',
  DATE '2024-04-20', 'Open',
  DATE '2024-04-20', DATE '2024-04-20',
  TIMESTAMP '2024-04-18 08:00:00', NULL,
  DATE '2024-04-30'
);

INSERT INTO index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-76516', 'AH-AC-WS WS-76516', 'Exotic Disease', 'Northern Ireland',
  'Rapid Response to Disease Outbreak',
  'Exotic Notifiable Disease',
  'Emergency Disease Response',
  'Pigs', 'EMERGENCY'
);

-- No entities for WS-76516 (NULL relationships test)

-- Activity for WS-76516
INSERT INTO ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey)
VALUES ('WS-76516-ACT1', 'AH-AC-WS-ACT WS-76516-ACT1', 'activity-8', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-76516');

INSERT INTO index_ac_activity (pyid, actname, activitysequencenumber)
VALUES ('activity-8', 'Emergency Site Assessment', 1);

-- WS-99999: INACTIVE (negative control)
INSERT INTO ahwork_ac (
  pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
  wsactivationdate, wsstartdate, wsearliestactivitystartdate,
  wslatestactivitycompletiondate, pysladeadline
) VALUES (
  'WS-99999', 'AH-AC-WS WS-99999', 'AH-AC-WS',
  DATE '2023-12-01', 'Closed',  -- CLOSED status
  DATE '2023-12-01', DATE '2023-12-01',
  TIMESTAMP '2023-11-28 09:00:00', TIMESTAMP '2023-12-15 00:00:00',
  DATE '2023-12-10'
);

INSERT INTO index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-99999', 'AH-AC-WS WS-99999', 'Test', 'England',
  'Test Purpose', 'Test Area', 'Archived Work Order',
  'Cattle', 'COMPLETED'
);

-- WS-76517: Future date
INSERT INTO ahwork_ac (
  pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
  wsactivationdate, wsstartdate, wsearliestactivitystartdate,
  wslatestactivitycompletiondate, pysladeadline
) VALUES (
  'WS-76517', 'AH-AC-WS WS-76517', 'AH-AC-WS',
  DATE '2024-06-01', 'Open',
  DATE '2024-06-01', DATE '2024-06-01',
  TIMESTAMP '2024-05-30 08:00:00', NULL,
  DATE '2024-06-10'
);

INSERT INTO index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-76517', 'AH-AC-WS WS-76517', 'General Inspection', 'England',
  'Scheduled Health Check', 'Animal Health and Welfare',
  'Planned Routine Inspection', 'Cattle', 'PREINSPECTION'
);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('C123456', 'WS-76517', 'workScheduleCustomers', NULL);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('LOC-ALPHA', 'WS-76517', 'workScheduleLocation', '01/001/0001');

-- WS-76518: Pagination test + facility only
INSERT INTO ahwork_ac (
  pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
  wsactivationdate, wsstartdate, wsearliestactivitystartdate,
  wslatestactivitycompletiondate, pysladeadline
) VALUES (
  'WS-76518', 'AH-AC-WS WS-76518', 'AH-AC-WS',
  DATE '2024-01-05', 'Open',
  DATE '2024-01-05', DATE '2024-01-05',
  TIMESTAMP '2024-01-01 09:00:00', NULL,
  DATE '2024-01-15'
);

INSERT INTO index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-76518', 'AH-AC-WS WS-76518', 'Disease Investigation', 'England',
  'Disease Surveillance', 'Endemic Notifiable Disease',
  'Concurrent Investigation with Multiple Facility Inspection',
  'Cattle', 'INVESTIGATION'
);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('C123456', 'WS-76518', 'workScheduleCustomers', NULL);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('LOC-ALPHA', 'WS-76518', 'workScheduleLocation', '01/001/0001');

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000030', 'WS-76518', 'workScheduleFacilities', NULL);

-- WS-76519: Comprehensive (4 activities + 2 livestock + 1 facility)
INSERT INTO ahwork_ac (
  pyid, pzinskey, pxobjclass, pxupdatedatetime, pystatuswork,
  wsactivationdate, wsstartdate, wsearliestactivitystartdate,
  wslatestactivitycompletiondate, pysladeadline
) VALUES (
  'WS-76519', 'AH-AC-WS WS-76519', 'AH-AC-WS',
  DATE '2024-05-15', 'Open',
  DATE '2024-05-15', DATE '2024-05-15',
  TIMESTAMP '2024-05-10 08:00:00', NULL,
  DATE '2024-05-25'
);

INSERT INTO index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-76519', 'AH-AC-WS WS-76519', 'Biosecurity Audit', 'Wales',
  'Comprehensive Farm Assessment', 'Animal Health and Welfare',
  'Comprehensive Multi-Facility and Multi-Unit Inspection',
  'Mixed', 'AUDIT'
);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('C789012', 'WS-76519', 'workScheduleCustomers', NULL);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('LOC-THETA', 'WS-76519', 'workScheduleLocation', '01/409/1111');

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000010', 'WS-76519', 'workScheduleLivestockUnits', NULL);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000020', 'WS-76519', 'workScheduleLivestockUnits', NULL);

INSERT INTO index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000030', 'WS-76519', 'workScheduleFacilities', NULL);

-- Activities for WS-76519 (4 activities)
INSERT INTO ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey)
VALUES ('WS-76519-ACT1', 'AH-AC-WS-ACT WS-76519-ACT1', 'activity-9', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-76519');

INSERT INTO index_ac_activity (pyid, actname, activitysequencenumber)
VALUES ('activity-9', 'Comprehensive Site Audit', 1);

INSERT INTO ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey)
VALUES ('WS-76519-ACT2', 'AH-AC-WS-ACT WS-76519-ACT2', 'activity-10', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-76519');

INSERT INTO index_ac_activity (pyid, actname, activitysequencenumber)
VALUES ('activity-10', 'Review All Livestock Units', 2);

INSERT INTO ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey)
VALUES ('WS-76519-ACT3', 'AH-AC-WS-ACT WS-76519-ACT3', 'activity-11', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-76519');

INSERT INTO index_ac_activity (pyid, actname, activitysequencenumber)
VALUES ('activity-11', 'Inspect All Facilities', 3);

INSERT INTO ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey)
VALUES ('WS-76519-ACT4', 'AH-AC-WS-ACT WS-76519-ACT4', 'activity-12', 'AH-AC-WS-ACT', 'Open', 'AH-AC-WS-76519');

INSERT INTO index_ac_activity (pyid, actname, activitysequencenumber)
VALUES ('activity-12', 'Generate Compliance Report', 4);

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Grant privileges
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON pega_data.ahwork_ac TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON pega_data.index_ac_workschedule TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON pega_data.index_ac_wsentities TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON pega_data.index_ac_activity TO sam'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON pega_data.ahwork_ac TO ahbrp'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON pega_data.index_ac_workschedule TO ahbrp'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON pega_data.index_ac_wsentities TO ahbrp'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'GRANT SELECT ON pega_data.index_ac_activity TO ahbrp'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

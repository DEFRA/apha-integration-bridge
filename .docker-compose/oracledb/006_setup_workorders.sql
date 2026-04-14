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
BEGIN EXECUTE IMMEDIATE 'DROP TABLE pega_data.index_ac_activity PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE pega_data.index_ac_wsentities PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE pega_data.index_ac_workschedule PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE pega_data.ahwork_ac PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- Create Pega tables based on find-workorders.sql query structure
-- ─────────────────────────────────────────────────────────────────────────────

-- Main work order table (AHWORK_AC)
CREATE TABLE pega_data.ahwork_ac (
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
  pydescription                     VARCHAR2(500),              -- Description
  activitysequencenumber            NUMBER                      -- Sequence number
);

-- Work schedule index table (denormalized Pega structure)
CREATE TABLE pega_data.index_ac_workschedule (
  pyid                  VARCHAR2(50)  NOT NULL,       -- Work order ID
  pxinsindexedkey       VARCHAR2(200) PRIMARY KEY,    -- Indexed key (links to pega_data.ahwork_ac.pzinskey)
  purposeworkarea       VARCHAR2(100),                -- Work area (e.g., 'Tuberculosis')
  purposecountry        VARCHAR2(50),                 -- Country
  aimname               VARCHAR2(500),                -- Aim
  businessarea          VARCHAR2(100),                -- Business area
  purposename           VARCHAR2(500),                -- Purpose
  speciesforpurpose     VARCHAR2(50),                 -- Species
  phase                 VARCHAR2(50)                  -- Phase
);

-- Entities table (handles locations, customers, livestock units, facilities)
CREATE TABLE pega_data.index_ac_wsentities (
  entityid          VARCHAR2(50)  NOT NULL,   -- Entity ID (location_id, customer_id, etc.)
  pyid              VARCHAR2(50)  NOT NULL,   -- Work order ID
  pxindexpurpose    VARCHAR2(100) NOT NULL,   -- Purpose flag determines entity type
  cphid             VARCHAR2(50),             -- CPH ID (for locations)
  CONSTRAINT pk_wsentities PRIMARY KEY (pyid, pxindexpurpose, entityid)
);

-- Activity index table
CREATE TABLE pega_data.index_ac_activity (
  pyid                      VARCHAR2(50)  PRIMARY KEY,  -- Activity ID
  actname                   VARCHAR2(255) NOT NULL     -- Activity name
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Create indexes for performance
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_ahwork_pyid ON pega_data.ahwork_ac (pyid)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_ahwork_status ON pega_data.ahwork_ac (pystatuswork)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_ws_pyid ON pega_data.index_ac_workschedule (pyid)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_ws_country ON pega_data.index_ac_workschedule (purposecountry)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_wse_pyid ON pega_data.index_ac_wsentities (pyid)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'CREATE INDEX idx_wse_purpose ON pega_data.index_ac_wsentities (pxindexpurpose)'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed data: Work Orders (matching the 9 work orders from original seed)
-- ─────────────────────────────────────────────────────────────────────────────

-- WS-76512: England, Cattle, Empty relationships
INSERT INTO pega_data.ahwork_ac (
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

INSERT INTO pega_data.index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-76512', 'AH-AC-WS WS-76512', 'Tuberculosis', 'England',
  'Contain / Control / Eradicate Endemic Disease',
  'Endemic Notifiable Disease',
  'Initiate Incident Premises Spread Tracing Action',
  'Cattle', 'EXPOSURETRACKING'
);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('C123456', 'WS-76512', 'workScheduleCustomers', NULL);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('LOC-ALPHA', 'WS-76512', 'workScheduleLocation', '01/001/0001');

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000010', 'WS-76512', 'workScheduleLivestockUnits', NULL);

-- WS-76513: Scotland, Sheep, Mixed relationships (1 livestock + 1 facility)
INSERT INTO pega_data.ahwork_ac (
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

INSERT INTO pega_data.index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-76513', 'AH-AC-WS WS-76513', 'Tuberculosis', 'Scotland',
  'Contain / Control / Eradicate Endemic Disease',
  'Endemic Notifiable Disease',
  'Initiate Incident Premises Spread Tracing Action',
  'Sheep', 'EXPOSURETRACKING'
);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('O123456', 'WS-76513', 'workScheduleCustomers', NULL);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('LOC-BETA', 'WS-76513', 'workScheduleLocation', '45/001/0002');

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000020', 'WS-76513', 'workScheduleLivestockUnits', NULL);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000030', 'WS-76513', 'workScheduleFacilities', NULL);

-- Activities for WS-76513
INSERT INTO pega_data.ahwork_ac (
  pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey,
  activitysequencenumber
) VALUES (
  'WS-76513-ACT1', 'AH-AC-WS-ACT WS-76513-ACT1', 'activity-1',
  'AH-AC-WS-ACT', 'Open', 'AH-AC WS-76513', 1
);

INSERT INTO pega_data.index_ac_activity (pyid, actname)
VALUES ('activity-1', 'Arrange Visit');

INSERT INTO pega_data.ahwork_ac (
  pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey,
  activitysequencenumber
) VALUES (
  'WS-76513-ACT2', 'AH-AC-WS-ACT WS-76513-ACT2', 'activity-2',
  'AH-AC-WS-ACT', 'Open', 'AH-AC WS-76513', 2
);

INSERT INTO pega_data.index_ac_activity (pyid, actname)
VALUES ('activity-2', 'Perform TB Skin Test');

-- WS-76514: Wales, Multiple livestock units (2)
INSERT INTO pega_data.ahwork_ac (
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

INSERT INTO pega_data.index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-76514', 'AH-AC-WS WS-76514', 'General Inspection', 'Wales',
  'Ensure Compliance with Animal Health Standards',
  'Animal Health and Welfare',
  'Routine Inspection and Disease Monitoring',
  'Cattle', 'INSPECTION'
);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('C789012', 'WS-76514', 'workScheduleCustomers', NULL);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('LOC-OMEGA', 'WS-76514', 'workScheduleLocation', '01/409/1111');

-- Multiple livestock units
INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000010', 'WS-76514', 'workScheduleLivestockUnits', NULL);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000020', 'WS-76514', 'workScheduleLivestockUnits', NULL);

-- Activities for WS-76514 (3 activities)
INSERT INTO pega_data.ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
VALUES ('WS-76514-ACT1', 'AH-AC-WS-ACT WS-76514-ACT1', 'activity-3', 'AH-AC-WS-ACT', 'Open', 'AH-AC WS-76514', 1);

INSERT INTO pega_data.index_ac_activity (pyid, actname)
VALUES ('activity-3', 'Initial Farm Assessment');

INSERT INTO pega_data.ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
VALUES ('WS-76514-ACT2', 'AH-AC-WS-ACT WS-76514-ACT2', 'activity-4', 'AH-AC-WS-ACT', 'Open', 'AH-AC WS-76514', 2);

INSERT INTO pega_data.index_ac_activity (pyid, actname)
VALUES ('activity-4', 'Livestock Document Review');

INSERT INTO pega_data.ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
VALUES ('WS-76514-ACT3', 'AH-AC-WS-ACT WS-76514-ACT3', 'activity-5', 'AH-AC-WS-ACT', 'Open', 'AH-AC WS-76514', 3);

INSERT INTO pega_data.index_ac_activity (pyid, actname)
VALUES ('activity-5', 'Physical Animal Inspection');

-- WS-76515: England, Multiple livestock (2) + facility (1)
INSERT INTO pega_data.ahwork_ac (
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

INSERT INTO pega_data.index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-76515', 'AH-AC-WS WS-76515', 'Movement Controls', 'England',
  'Prevent Disease Spread Through Movement',
  'Trade and Movement',
  'Post-Movement Testing and Facility Inspection',
  'Sheep', 'POSTMOVEMENT'
);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('O456789', 'WS-76515', 'workScheduleCustomers', NULL);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('LOC-ALPHA', 'WS-76515', 'workScheduleLocation', '01/001/0001');

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000010', 'WS-76515', 'workScheduleLivestockUnits', NULL);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000020', 'WS-76515', 'workScheduleLivestockUnits', NULL);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000030', 'WS-76515', 'workScheduleFacilities', NULL);

-- Activities for WS-76515
INSERT INTO pega_data.ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
VALUES ('WS-76515-ACT1', 'AH-AC-WS-ACT WS-76515-ACT1', 'activity-6', 'AH-AC-WS-ACT', 'Open', 'AH-AC WS-76515', 1);

INSERT INTO pega_data.index_ac_activity (pyid, actname)
VALUES ('activity-6', 'Verify Movement Documentation');

INSERT INTO pega_data.ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
VALUES ('WS-76515-ACT2', 'AH-AC-WS-ACT WS-76515-ACT2', 'activity-7', 'AH-AC-WS-ACT', 'Open', 'AH-AC WS-76515', 2);

INSERT INTO pega_data.index_ac_activity (pyid, actname)
VALUES ('activity-7', 'Inspect Holding Facilities');

-- WS-76516: Northern Ireland, NULL relationships
INSERT INTO pega_data.ahwork_ac (
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

INSERT INTO pega_data.index_ac_workschedule (
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
INSERT INTO pega_data.ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
VALUES ('WS-76516-ACT1', 'AH-AC-WS-ACT WS-76516-ACT1', 'activity-8', 'AH-AC-WS-ACT', 'Open', 'AH-AC WS-76516', 1);

INSERT INTO pega_data.index_ac_activity (pyid, actname)
VALUES ('activity-8', 'Emergency Site Assessment');

-- WS-76517: Future date
INSERT INTO pega_data.ahwork_ac (
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

INSERT INTO pega_data.index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-76517', 'AH-AC-WS WS-76517', 'General Inspection', 'England',
  'Scheduled Health Check', 'Animal Health and Welfare',
  'Planned Routine Inspection', 'Cattle', 'PREINSPECTION'
);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('C123456', 'WS-76517', 'workScheduleCustomers', NULL);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('LOC-ALPHA', 'WS-76517', 'workScheduleLocation', '01/001/0001');

-- WS-76518: Pagination test + facility only
INSERT INTO pega_data.ahwork_ac (
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

INSERT INTO pega_data.index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-76518', 'AH-AC-WS WS-76518', 'Disease Investigation', 'England',
  'Disease Surveillance', 'Endemic Notifiable Disease',
  'Concurrent Investigation with Multiple Facility Inspection',
  'Cattle', 'INVESTIGATION'
);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('C123456', 'WS-76518', 'workScheduleCustomers', NULL);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('LOC-ALPHA', 'WS-76518', 'workScheduleLocation', '01/001/0001');

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000030', 'WS-76518', 'workScheduleFacilities', NULL);

-- WS-76519: Comprehensive (4 activities + 2 livestock + 1 facility)
INSERT INTO pega_data.ahwork_ac (
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

INSERT INTO pega_data.index_ac_workschedule (
  pyid, pxinsindexedkey, purposeworkarea, purposecountry, aimname,
  businessarea, purposename, speciesforpurpose, phase
) VALUES (
  'WS-76519', 'AH-AC-WS WS-76519', 'Biosecurity Audit', 'Wales',
  'Comprehensive Farm Assessment', 'Animal Health and Welfare',
  'Comprehensive Multi-Facility and Multi-Unit Inspection',
  'Mixed', 'AUDIT'
);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('C789012', 'WS-76519', 'workScheduleCustomers', NULL);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('LOC-THETA', 'WS-76519', 'workScheduleLocation', '01/409/1111');

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000010', 'WS-76519', 'workScheduleLivestockUnits', NULL);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000020', 'WS-76519', 'workScheduleLivestockUnits', NULL);

INSERT INTO pega_data.index_ac_wsentities (entityid, pyid, pxindexpurpose, cphid)
VALUES ('U000030', 'WS-76519', 'workScheduleFacilities', NULL);

-- Activities for WS-76519 (4 activities)
INSERT INTO pega_data.ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
VALUES ('WS-76519-ACT1', 'AH-AC-WS-ACT WS-76519-ACT1', 'activity-9', 'AH-AC-WS-ACT', 'Open', 'AH-AC WS-76519', 1);

INSERT INTO pega_data.index_ac_activity (pyid, actname)
VALUES ('activity-9', 'Comprehensive Site Audit');

INSERT INTO pega_data.ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
VALUES ('WS-76519-ACT2', 'AH-AC-WS-ACT WS-76519-ACT2', 'activity-10', 'AH-AC-WS-ACT', 'Open', 'AH-AC WS-76519', 2);

INSERT INTO pega_data.index_ac_activity (pyid, actname)
VALUES ('activity-10', 'Review All Livestock Units');

INSERT INTO pega_data.ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
VALUES ('WS-76519-ACT3', 'AH-AC-WS-ACT WS-76519-ACT3', 'activity-11', 'AH-AC-WS-ACT', 'Open', 'AH-AC WS-76519', 3);

INSERT INTO pega_data.index_ac_activity (pyid, actname)
VALUES ('activity-11', 'Inspect All Facilities');

INSERT INTO pega_data.ahwork_ac (pyid, pzinskey, pxinsname, pxobjclass, pystatuswork, pxcoverinskey, activitysequencenumber)
VALUES ('WS-76519-ACT4', 'AH-AC-WS-ACT WS-76519-ACT4', 'activity-12', 'AH-AC-WS-ACT', 'Open', 'AH-AC WS-76519', 4);

INSERT INTO pega_data.index_ac_activity (pyid, actname)
VALUES ('activity-12', 'Generate Compliance Report');

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed AHBRP reference data for work order mapping lookups
-- ─────────────────────────────────────────────────────────────────────────────

CONNECT ahbrp/password@FREEPDB1;

BEGIN
  INSERT INTO ref_data_set (ref_data_set_pk, ref_data_set_name, effective_to_date)
  VALUES (5000, 'WORK_AREA', NULL);
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/

BEGIN
  INSERT INTO ref_data_set (ref_data_set_pk, ref_data_set_name, effective_to_date)
  VALUES (5001, 'BCF_ANIMAL_SPECIES', NULL);
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/

DECLARE
  tuberculosis_work_area_pk NUMBER := 50001;
  tuberculosis_short_code_pk NUMBER := 50002;
  cattle_species_pk NUMBER := 50003;
  general_inspection_work_area_pk NUMBER := 50004;
  sheep_species_pk NUMBER := 50005;
  movement_controls_work_area_pk NUMBER := 50006;
  exotic_disease_work_area_pk NUMBER := 50007;
  pigs_species_pk NUMBER := 50008;
  disease_investigation_work_area_pk NUMBER := 50009;
  biosecurity_audit_work_area_pk NUMBER := 50010;
  mixed_species_pk NUMBER := 50011;
  cattle_short_code_pk NUMBER := 50012;
BEGIN
  BEGIN
    INSERT INTO ref_data_code (
      ref_data_code_pk,
      code,
      ref_data_set_pk,
      effective_to_date
    ) VALUES (
      tuberculosis_work_area_pk,
      'Tuberculosis',
      5000,
      DATE '9999-12-31'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (
      ref_data_code_pk,
      short_description,
      language_code
    ) VALUES (
      tuberculosis_work_area_pk,
      'Tuberculosis',
      'ENG'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code (
      ref_data_code_pk,
      code,
      ref_data_set_pk,
      effective_to_date
    ) VALUES (
      tuberculosis_short_code_pk,
      'TB',
      5000,
      DATE '9999-12-31'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (
      ref_data_code_pk,
      short_description,
      language_code
    ) VALUES (
      tuberculosis_short_code_pk,
      'Tuberculosis',
      'ENG'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code (
      ref_data_code_pk,
      code,
      ref_data_set_pk,
      effective_to_date
    ) VALUES (
      cattle_species_pk,
      'Cattle',
      5001,
      DATE '9999-12-31'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (
      ref_data_code_pk,
      short_description,
      language_code
    ) VALUES (
      cattle_species_pk,
      'Cattle',
      'ENG'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code (
      ref_data_code_pk,
      code,
      ref_data_set_pk,
      effective_to_date
    ) VALUES (
      cattle_short_code_pk,
      'CTT',
      5001,
      DATE '9999-12-31'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (
      ref_data_code_pk,
      short_description,
      language_code
    ) VALUES (
      cattle_short_code_pk,
      'Cattle',
      'ENG'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code (
      ref_data_code_pk,
      code,
      ref_data_set_pk,
      effective_to_date
    ) VALUES (
      general_inspection_work_area_pk,
      'General Inspection',
      5000,
      DATE '9999-12-31'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (
      ref_data_code_pk,
      short_description,
      language_code
    ) VALUES (
      general_inspection_work_area_pk,
      'General Inspection',
      'ENG'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code (
      ref_data_code_pk,
      code,
      ref_data_set_pk,
      effective_to_date
    ) VALUES (
      sheep_species_pk,
      'Sheep',
      5001,
      DATE '9999-12-31'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (
      ref_data_code_pk,
      short_description,
      language_code
    ) VALUES (
      sheep_species_pk,
      'Sheep',
      'ENG'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code (
      ref_data_code_pk,
      code,
      ref_data_set_pk,
      effective_to_date
    ) VALUES (
      movement_controls_work_area_pk,
      'Movement Controls',
      5000,
      DATE '9999-12-31'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (
      ref_data_code_pk,
      short_description,
      language_code
    ) VALUES (
      movement_controls_work_area_pk,
      'Movement Controls',
      'ENG'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code (
      ref_data_code_pk,
      code,
      ref_data_set_pk,
      effective_to_date
    ) VALUES (
      exotic_disease_work_area_pk,
      'Exotic Disease',
      5000,
      DATE '9999-12-31'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (
      ref_data_code_pk,
      short_description,
      language_code
    ) VALUES (
      exotic_disease_work_area_pk,
      'Exotic Disease',
      'ENG'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code (
      ref_data_code_pk,
      code,
      ref_data_set_pk,
      effective_to_date
    ) VALUES (
      pigs_species_pk,
      'Pigs',
      5001,
      DATE '9999-12-31'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (
      ref_data_code_pk,
      short_description,
      language_code
    ) VALUES (
      pigs_species_pk,
      'Pigs',
      'ENG'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code (
      ref_data_code_pk,
      code,
      ref_data_set_pk,
      effective_to_date
    ) VALUES (
      disease_investigation_work_area_pk,
      'Disease Investigation',
      5000,
      DATE '9999-12-31'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (
      ref_data_code_pk,
      short_description,
      language_code
    ) VALUES (
      disease_investigation_work_area_pk,
      'Disease Investigation',
      'ENG'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code (
      ref_data_code_pk,
      code,
      ref_data_set_pk,
      effective_to_date
    ) VALUES (
      biosecurity_audit_work_area_pk,
      'Biosecurity Audit',
      5000,
      DATE '9999-12-31'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (
      ref_data_code_pk,
      short_description,
      language_code
    ) VALUES (
      biosecurity_audit_work_area_pk,
      'Biosecurity Audit',
      'ENG'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code (
      ref_data_code_pk,
      code,
      ref_data_set_pk,
      effective_to_date
    ) VALUES (
      mixed_species_pk,
      'Mixed',
      5001,
      DATE '9999-12-31'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (
      ref_data_code_pk,
      short_description,
      language_code
    ) VALUES (
      mixed_species_pk,
      'Mixed',
      'ENG'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
END;
/

COMMIT;

CONNECT pega_data/password@FREEPDB1;

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

-- ─────────────────────────────────────────────────────────────────────────────
--  009_add_foreign_keys.sql
--  Adds the in-scope AHBRP foreign keys LAST — after every table and seed row
--  from 001..008 exists — so each constraint is validated against fully-loaded
--  data. An orphan row makes the matching ADD CONSTRAINT raise ORA-02298, which
--  surfaces in the container log and fails verification (the boot is the FK gate).
--  This decouples FK creation from table create/drop ordering (plan D9 refinement).
--
--  Parent-column references are corrected where the generated canonical DDL
--  (.schema/derived/sam-relational-schema.sql) erroneously named the child column
--  as the parent column. FKs whose parent table is out of fixture scope are
--  omitted (documented inline in the relevant CREATE TABLE).
--
--  add_fk() swallows ONLY "constraint already exists" (re-boot over a persisted
--  volume); any real failure (e.g. ORA-02298 orphan, ORA-00942 missing table) is
--  re-raised so it cannot ship silently.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

DECLARE
  PROCEDURE add_fk(p_ddl VARCHAR2) IS
  BEGIN
    EXECUTE IMMEDIATE p_ddl;
  EXCEPTION
    WHEN OTHERS THEN
      -- -2264/-2275: constraint name / referential constraint already exists
      -- -955: name already used by an existing object
      IF SQLCODE IN (-2264, -2275, -955) THEN
        NULL;
      ELSE
        RAISE;
      END IF;
  END;
BEGIN
  -- ── Reference-data cluster (Stage 2) ───────────────────────────────────────
  add_fk('ALTER TABLE ref_data_code ADD CONSTRAINT fk_rdco_ref_data_set FOREIGN KEY (ref_data_set_pk) REFERENCES ref_data_set (ref_data_set_pk)');
  add_fk('ALTER TABLE ref_data_code_desc ADD CONSTRAINT fk_rdcd_ref_data_code FOREIGN KEY (ref_data_code_pk) REFERENCES ref_data_code (ref_data_code_pk)');
  add_fk('ALTER TABLE ref_data_set_map ADD CONSTRAINT fk_rdsm_ref_data_set_fm FOREIGN KEY (from_ref_data_set_pk) REFERENCES ref_data_set (ref_data_set_pk)');
  add_fk('ALTER TABLE ref_data_set_map ADD CONSTRAINT fk_rdsm_ref_data_set_to FOREIGN KEY (to_ref_data_set_pk) REFERENCES ref_data_set (ref_data_set_pk)');
  add_fk('ALTER TABLE ref_data_code_map ADD CONSTRAINT fk_rdcm_ref_data_set_map FOREIGN KEY (ref_data_set_map_pk) REFERENCES ref_data_set_map (ref_data_set_map_pk)');
  add_fk('ALTER TABLE ref_data_code_map ADD CONSTRAINT fk_rdcm_ref_data_code_fm FOREIGN KEY (from_ref_data_code_pk) REFERENCES ref_data_code (ref_data_code_pk)');
  add_fk('ALTER TABLE ref_data_code_map ADD CONSTRAINT fk_rdcm_ref_data_code_to FOREIGN KEY (to_ref_data_code_pk) REFERENCES ref_data_code (ref_data_code_pk)');
END;
/

COMMIT;

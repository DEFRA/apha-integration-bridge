-- ─────────────────────────────────────────────────────────────────────────────
--  003_add_holdings_with_null_party_state_to_dttm.sql
--  Seeds three CPH holdings that mirror the 04/432/1234 setup from 002,
--  except PARTY_STATE_TO_DTTM is intentionally NULL.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- Local authority mapping for 11/111
BEGIN
  INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date)
  VALUES (11111, 'LA11111', DATE '9999-12-31');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/
BEGIN
  INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description)
  VALUES (11111, 'Local Authority 11/111');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/
BEGIN
  INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date)
  VALUES (21111, '11/111', DATE '9999-12-31');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/
BEGIN
  INSERT INTO ref_data_code_map (
    ref_data_code_map_pk,
    ref_data_set_map_pk,
    from_ref_data_code_pk,
    to_ref_data_code_pk,
    effective_to_date
  ) VALUES (
    31111,
    1,
    11111,
    21111,
    DATE '9999-12-31'
  );
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/

-- Local authority mapping for 22/222
BEGIN
  INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date)
  VALUES (12222, 'LA22222', DATE '9999-12-31');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/
BEGIN
  INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description)
  VALUES (12222, 'Local Authority 22/222');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/
BEGIN
  INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date)
  VALUES (22222, '22/222', DATE '9999-12-31');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/
BEGIN
  INSERT INTO ref_data_code_map (
    ref_data_code_map_pk,
    ref_data_set_map_pk,
    from_ref_data_code_pk,
    to_ref_data_code_pk,
    effective_to_date
  ) VALUES (
    32222,
    1,
    12222,
    22222,
    DATE '9999-12-31'
  );
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/

-- Local authority mapping for 33/333
BEGIN
  INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date)
  VALUES (13333, 'LA33333', DATE '9999-12-31');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/
BEGIN
  INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description)
  VALUES (13333, 'Local Authority 33/333');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/
BEGIN
  INSERT INTO ref_data_code (ref_data_code_pk, code, effective_to_date)
  VALUES (23333, '33/333', DATE '9999-12-31');
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/
BEGIN
  INSERT INTO ref_data_code_map (
    ref_data_code_map_pk,
    ref_data_set_map_pk,
    from_ref_data_code_pk,
    to_ref_data_code_pk,
    effective_to_date
  ) VALUES (
    33333,
    1,
    13333,
    23333,
    DATE '9999-12-31'
  );
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL;
END;
/

DECLARE
  first_party_primary_key NUMBER := 50111;
  first_party_role_primary_key NUMBER := 51111;
  first_feature_primary_key NUMBER := 81111;

  second_party_primary_key NUMBER := 50222;
  second_party_role_primary_key NUMBER := 51222;
  second_feature_primary_key NUMBER := 82222;

  third_party_primary_key NUMBER := 50333;
  third_party_role_primary_key NUMBER := 51333;
  third_feature_primary_key NUMBER := 83333;
BEGIN
  -- CPH 11/111/1111
  BEGIN
    INSERT INTO v_cph_customer_unit (cph, cph_type)
    VALUES ('11/111/1111', 'HOLDER_TEST');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO party (party_pk, party_id)
    VALUES (first_party_primary_key, 'CUST-111111111');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date)
    VALUES (first_party_role_primary_key, first_party_primary_key, NULL);
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  MERGE INTO party_state party_state_record
  USING (
    SELECT first_party_primary_key AS party_pk,
           'ACTIVE' AS party_status_code,
           CAST(NULL AS DATE) AS party_state_to_dttm
    FROM dual
  ) source_record
  ON (party_state_record.party_pk = source_record.party_pk)
  WHEN MATCHED THEN UPDATE
    SET party_state_record.party_status_code = source_record.party_status_code,
        party_state_record.party_state_to_dttm = source_record.party_state_to_dttm
  WHEN NOT MATCHED THEN INSERT (party_pk, party_status_code, party_state_to_dttm)
    VALUES (source_record.party_pk, source_record.party_status_code, source_record.party_state_to_dttm);

  BEGIN
    INSERT INTO feature_involvement (
      feature_pk,
      cph,
      feature_involvement_type,
      feature_involv_to_date,
      party_role_pk
    ) VALUES (
      first_feature_primary_key,
      '11/111/1111',
      'CPHHOLDERSHIP',
      NULL,
      first_party_role_primary_key
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO location (feature_pk, location_id)
    VALUES (first_feature_primary_key, 'LOC-1111111111');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  MERGE INTO feature_state feature_state_record
  USING (
    SELECT first_feature_primary_key AS feature_pk,
           'ACTIVE' AS feature_status_code,
           CAST(NULL AS DATE) AS feature_state_to_dttm
    FROM dual
  ) source_record
  ON (feature_state_record.feature_pk = source_record.feature_pk)
  WHEN MATCHED THEN UPDATE
    SET feature_state_record.feature_status_code = source_record.feature_status_code,
        feature_state_record.feature_state_to_dttm = source_record.feature_state_to_dttm
  WHEN NOT MATCHED THEN INSERT (feature_pk, feature_status_code, feature_state_to_dttm)
    VALUES (source_record.feature_pk, source_record.feature_status_code, source_record.feature_state_to_dttm);

  -- CPH 22/222/2222
  BEGIN
    INSERT INTO v_cph_customer_unit (cph, cph_type)
    VALUES ('22/222/2222', 'HOLDER_TEST');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO party (party_pk, party_id)
    VALUES (second_party_primary_key, 'CUST-222222222');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date)
    VALUES (second_party_role_primary_key, second_party_primary_key, NULL);
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  MERGE INTO party_state party_state_record
  USING (
    SELECT second_party_primary_key AS party_pk,
           'ACTIVE' AS party_status_code,
           CAST(NULL AS DATE) AS party_state_to_dttm
    FROM dual
  ) source_record
  ON (party_state_record.party_pk = source_record.party_pk)
  WHEN MATCHED THEN UPDATE
    SET party_state_record.party_status_code = source_record.party_status_code,
        party_state_record.party_state_to_dttm = source_record.party_state_to_dttm
  WHEN NOT MATCHED THEN INSERT (party_pk, party_status_code, party_state_to_dttm)
    VALUES (source_record.party_pk, source_record.party_status_code, source_record.party_state_to_dttm);

  BEGIN
    INSERT INTO feature_involvement (
      feature_pk,
      cph,
      feature_involvement_type,
      feature_involv_to_date,
      party_role_pk
    ) VALUES (
      second_feature_primary_key,
      '22/222/2222',
      'CPHHOLDERSHIP',
      NULL,
      second_party_role_primary_key
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO location (feature_pk, location_id)
    VALUES (second_feature_primary_key, 'LOC-2222222222');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  MERGE INTO feature_state feature_state_record
  USING (
    SELECT second_feature_primary_key AS feature_pk,
           'ACTIVE' AS feature_status_code,
           CAST(NULL AS DATE) AS feature_state_to_dttm
    FROM dual
  ) source_record
  ON (feature_state_record.feature_pk = source_record.feature_pk)
  WHEN MATCHED THEN UPDATE
    SET feature_state_record.feature_status_code = source_record.feature_status_code,
        feature_state_record.feature_state_to_dttm = source_record.feature_state_to_dttm
  WHEN NOT MATCHED THEN INSERT (feature_pk, feature_status_code, feature_state_to_dttm)
    VALUES (source_record.feature_pk, source_record.feature_status_code, source_record.feature_state_to_dttm);

  -- CPH 33/333/3333
  BEGIN
    INSERT INTO v_cph_customer_unit (cph, cph_type)
    VALUES ('33/333/3333', 'HOLDER_TEST');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO party (party_pk, party_id)
    VALUES (third_party_primary_key, 'CUST-333333333');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date)
    VALUES (third_party_role_primary_key, third_party_primary_key, NULL);
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  MERGE INTO party_state party_state_record
  USING (
    SELECT third_party_primary_key AS party_pk,
           'ACTIVE' AS party_status_code,
           CAST(NULL AS DATE) AS party_state_to_dttm
    FROM dual
  ) source_record
  ON (party_state_record.party_pk = source_record.party_pk)
  WHEN MATCHED THEN UPDATE
    SET party_state_record.party_status_code = source_record.party_status_code,
        party_state_record.party_state_to_dttm = source_record.party_state_to_dttm
  WHEN NOT MATCHED THEN INSERT (party_pk, party_status_code, party_state_to_dttm)
    VALUES (source_record.party_pk, source_record.party_status_code, source_record.party_state_to_dttm);

  BEGIN
    INSERT INTO feature_involvement (
      feature_pk,
      cph,
      feature_involvement_type,
      feature_involv_to_date,
      party_role_pk
    ) VALUES (
      third_feature_primary_key,
      '33/333/3333',
      'CPHHOLDERSHIP',
      NULL,
      third_party_role_primary_key
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO location (feature_pk, location_id)
    VALUES (third_feature_primary_key, 'LOC-3333333333');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  MERGE INTO feature_state feature_state_record
  USING (
    SELECT third_feature_primary_key AS feature_pk,
           'ACTIVE' AS feature_status_code,
           CAST(NULL AS DATE) AS feature_state_to_dttm
    FROM dual
  ) source_record
  ON (feature_state_record.feature_pk = source_record.feature_pk)
  WHEN MATCHED THEN UPDATE
    SET feature_state_record.feature_status_code = source_record.feature_status_code,
        feature_state_record.feature_state_to_dttm = source_record.feature_state_to_dttm
  WHEN NOT MATCHED THEN INSERT (feature_pk, feature_status_code, feature_state_to_dttm)
    VALUES (source_record.feature_pk, source_record.feature_status_code, source_record.feature_state_to_dttm);
END;
/

COMMIT;

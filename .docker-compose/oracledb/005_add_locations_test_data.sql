-- ─────────────────────────────────────────────────────────────────────────────
--  005_add_locations_test_data.sql
--  Seeds test location data for L97339 and L97340 for the locations/find endpoint
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

DECLARE
  first_location_feature_pk NUMBER := 91001;
  second_location_feature_pk NUMBER := 91002;

  first_address_pk NUMBER := 92001;
  second_address_pk NUMBER := 92002;

  first_livestock_asset_pk NUMBER := 93001;
  first_facility_asset_pk NUMBER := 93002;
  second_livestock_asset_pk NUMBER := 93003;

BEGIN
  -- ─────────────────────────────────────────────────────────────────────────────
  -- Location L97339 with address, livestock unit, and facility
  -- ─────────────────────────────────────────────────────────────────────────────

  -- Create location
  BEGIN
    INSERT INTO location (feature_pk, location_id)
    VALUES (first_location_feature_pk, 'L97339');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create feature state for location (ACTIVE)
  MERGE INTO feature_state feature_state_record
  USING (
    SELECT first_location_feature_pk AS feature_pk,
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

  -- Create address for location
  BEGIN
    INSERT INTO bs7666_address (
      address_pk,
      paon_start_number,
      paon_start_number_suffix,
      paon_end_number,
      paon_end_number_suffix,
      paon_description,
      saon_start_number,
      saon_start_number_suffix,
      saon_end_number,
      saon_end_number_suffix,
      saon_description,
      street,
      locality,
      town,
      administrative_area,
      postcode,
      uk_internal_code,
      country_code
    ) VALUES (
      first_address_pk,
      123,
      NULL,
      NULL,
      NULL,
      'Test Building',
      NULL,
      NULL,
      NULL,
      NULL,
      'Unit 1',
      'Test Street',
      'Test Locality',
      'Test Town',
      'Test County',
      'TE1 1ST',
      'UK123',
      'GB'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Link address to location via feature_address
  BEGIN
    INSERT INTO feature_address (
      feature_pk,
      address_pk,
      feature_address_to_date
    ) VALUES (
      first_location_feature_pk,
      first_address_pk,
      NULL
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create feature point for location (OS map reference)
  BEGIN
    INSERT INTO feature_point (
      feature_pk,
      primary_feature_point_ind,
      feature_point_to_date,
      os_map_reference
    ) VALUES (
      first_location_feature_pk,
      'Y',
      NULL,
      'SK123456'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create livestock unit asset
  BEGIN
    INSERT INTO asset (
      asset_pk,
      animal_pk
    ) VALUES (
      first_livestock_asset_pk,
      NULL
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO livestock_unit (
      asset_pk,
      unit_id
    ) VALUES (
      first_livestock_asset_pk,
      'LU97339001'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create asset state for livestock unit (ACTIVE)
  MERGE INTO asset_state asset_state_record
  USING (
    SELECT first_livestock_asset_pk AS asset_pk,
           'ACTIVE' AS asset_status_code,
           CAST(NULL AS DATE) AS asset_state_to_dttm
    FROM dual
  ) source_record
  ON (asset_state_record.asset_pk = source_record.asset_pk)
  WHEN MATCHED THEN UPDATE
    SET asset_state_record.asset_status_code = source_record.asset_status_code,
        asset_state_record.asset_state_to_dttm = source_record.asset_state_to_dttm
  WHEN NOT MATCHED THEN INSERT (asset_pk, asset_status_code, asset_state_to_dttm)
    VALUES (source_record.asset_pk, source_record.asset_status_code, source_record.asset_state_to_dttm);

  -- Link livestock unit to location via asset_location
  BEGIN
    INSERT INTO asset_location (
      feature_pk,
      asset_pk,
      asset_location_type,
      asset_location_to_date
    ) VALUES (
      first_location_feature_pk,
      first_livestock_asset_pk,
      'PRIMARYLOCATION',
      NULL
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create COLL_REGSTRD_ANIMAL_GROUP with usual quantity
  BEGIN
    INSERT INTO coll_regstrd_animal_group (
      animal_pk,
      usual_quantity_of_animals
    ) VALUES (
      NULL,
      50
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create facility asset
  BEGIN
    INSERT INTO asset (
      asset_pk,
      animal_pk
    ) VALUES (
      first_facility_asset_pk,
      NULL
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO facility (
      asset_pk,
      unit_id
    ) VALUES (
      first_facility_asset_pk,
      'F97339001'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create asset state for facility (ACTIVE)
  MERGE INTO asset_state asset_state_record
  USING (
    SELECT first_facility_asset_pk AS asset_pk,
           'ACTIVE' AS asset_status_code,
           CAST(NULL AS DATE) AS asset_state_to_dttm
    FROM dual
  ) source_record
  ON (asset_state_record.asset_pk = source_record.asset_pk)
  WHEN MATCHED THEN UPDATE
    SET asset_state_record.asset_status_code = source_record.asset_status_code,
        asset_state_record.asset_state_to_dttm = source_record.asset_state_to_dttm
  WHEN NOT MATCHED THEN INSERT (asset_pk, asset_status_code, asset_state_to_dttm)
    VALUES (source_record.asset_pk, source_record.asset_status_code, source_record.asset_state_to_dttm);

  -- Link facility to location via asset_location
  BEGIN
    INSERT INTO asset_location (
      feature_pk,
      asset_pk,
      asset_location_type,
      asset_location_to_date
    ) VALUES (
      first_location_feature_pk,
      first_facility_asset_pk,
      'PRIMARYLOCATION',
      NULL
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- ─────────────────────────────────────────────────────────────────────────────
  -- Location L97340 with address and livestock unit only
  -- ─────────────────────────────────────────────────────────────────────────────

  -- Create location
  BEGIN
    INSERT INTO location (feature_pk, location_id)
    VALUES (second_location_feature_pk, 'L97340');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create feature state for location (ACTIVE)
  MERGE INTO feature_state feature_state_record
  USING (
    SELECT second_location_feature_pk AS feature_pk,
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

  -- Create address for location
  BEGIN
    INSERT INTO bs7666_address (
      address_pk,
      paon_start_number,
      paon_start_number_suffix,
      paon_end_number,
      paon_end_number_suffix,
      paon_description,
      saon_start_number,
      saon_start_number_suffix,
      saon_end_number,
      saon_end_number_suffix,
      saon_description,
      street,
      locality,
      town,
      administrative_area,
      postcode,
      uk_internal_code,
      country_code
    ) VALUES (
      second_address_pk,
      456,
      'A',
      NULL,
      NULL,
      'Farm House',
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      'Farm Road',
      'Little Village',
      'Bigtown',
      'Shire',
      'TE2 2ST',
      'UK456',
      'GB'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Link address to location via feature_address
  BEGIN
    INSERT INTO feature_address (
      feature_pk,
      address_pk,
      feature_address_to_date
    ) VALUES (
      second_location_feature_pk,
      second_address_pk,
      NULL
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create feature point for location (OS map reference)
  BEGIN
    INSERT INTO feature_point (
      feature_pk,
      primary_feature_point_ind,
      feature_point_to_date,
      os_map_reference
    ) VALUES (
      second_location_feature_pk,
      'Y',
      NULL,
      'SK789012'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create livestock unit asset
  BEGIN
    INSERT INTO asset (
      asset_pk,
      animal_pk
    ) VALUES (
      second_livestock_asset_pk,
      NULL
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO livestock_unit (
      asset_pk,
      unit_id
    ) VALUES (
      second_livestock_asset_pk,
      'LU97340001'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create asset state for livestock unit (ACTIVE)
  MERGE INTO asset_state asset_state_record
  USING (
    SELECT second_livestock_asset_pk AS asset_pk,
           'ACTIVE' AS asset_status_code,
           CAST(NULL AS DATE) AS asset_state_to_dttm
    FROM dual
  ) source_record
  ON (asset_state_record.asset_pk = source_record.asset_pk)
  WHEN MATCHED THEN UPDATE
    SET asset_state_record.asset_status_code = source_record.asset_status_code,
        asset_state_record.asset_state_to_dttm = source_record.asset_state_to_dttm
  WHEN NOT MATCHED THEN INSERT (asset_pk, asset_status_code, asset_state_to_dttm)
    VALUES (source_record.asset_pk, source_record.asset_status_code, source_record.asset_state_to_dttm);

  -- Link livestock unit to location via asset_location
  BEGIN
    INSERT INTO asset_location (
      feature_pk,
      asset_pk,
      asset_location_type,
      asset_location_to_date
    ) VALUES (
      second_location_feature_pk,
      second_livestock_asset_pk,
      'PRIMARYLOCATION',
      NULL
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create COLL_REGSTRD_ANIMAL_GROUP with usual quantity
  BEGIN
    INSERT INTO coll_regstrd_animal_group (
      animal_pk,
      usual_quantity_of_animals
    ) VALUES (
      NULL,
      100
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

END;
/

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
--  005_add_locations_test_data.sql
--  Seeds test location data for L97339 and L97340 for the locations/find endpoint
-- ─────────────────────────────────────────────────────────────────────────────

ALTER SESSION SET CONTAINER = FREEPDB1;
CONNECT ahbrp/password@FREEPDB1;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reference data for ANIMAL_SPECIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Create ANIMAL_SPECIES reference data set
BEGIN
  INSERT INTO ref_data_set (ref_data_set_pk, ref_data_set_name, effective_to_date)
  VALUES (1000, 'ANIMAL_SPECIES', NULL);
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/

-- Add CATTLE species
DECLARE
  cattle_code_pk NUMBER := 1001;
  cattle_species_pk NUMBER := 2001;
BEGIN
  -- Reference code for CATTLE
  BEGIN
    INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date)
    VALUES (cattle_code_pk, 'CATTLE', 1000, DATE '9999-12-31');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code)
    VALUES (cattle_code_pk, 'CATTLE', 'ENG');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Animal species for CATTLE
  BEGIN
    INSERT INTO animal_species (animal_species_pk, animal_species_code, animal_species_to_date)
    VALUES (cattle_species_pk, 'CATTLE', NULL);
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
END;
/

-- Add SHEEP species
DECLARE
  sheep_code_pk NUMBER := 1002;
  sheep_species_pk NUMBER := 2002;
BEGIN
  -- Reference code for SHEEP
  BEGIN
    INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date)
    VALUES (sheep_code_pk, 'SHEEP', 1000, DATE '9999-12-31');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code)
    VALUES (sheep_code_pk, 'SHEEP', 'ENG');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Animal species for SHEEP
  BEGIN
    INSERT INTO animal_species (animal_species_pk, animal_species_code, animal_species_to_date)
    VALUES (sheep_species_pk, 'SHEEP', NULL);
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- Reference data for FACILITY_TYPE and FACILITY_BUSINESS_ACTIVITY
-- ─────────────────────────────────────────────────────────────────────────────

-- Create FACILITY_TYPE reference data set
BEGIN
  INSERT INTO ref_data_set (ref_data_set_pk, ref_data_set_name, effective_to_date)
  VALUES (3000, 'FACILITY_TYPE', NULL);
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/

-- Create FACILITY_BUSINESS_ACTIVITY reference data set
BEGIN
  INSERT INTO ref_data_set (ref_data_set_pk, ref_data_set_name, effective_to_date)
  VALUES (4000, 'FACILITY_BUSINESS_ACTIVITY', NULL);
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/

-- Add Animal Breeding facility type
DECLARE
  breeding_type_pk NUMBER := 5001;
  breeding_type_code_pk NUMBER := 3001;
  breeding_activity_pk NUMBER := 6001;
  breeding_activity_code_pk NUMBER := 4001;
BEGIN
  -- Reference code for Animal Breeding facility type
  BEGIN
    INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date)
    VALUES (breeding_type_code_pk, 'ANIMAL_BREEDING', 3000, DATE '9999-12-31');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code)
    VALUES (breeding_type_code_pk, 'Animal Breeding', 'ENG');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Facility type record
  BEGIN
    INSERT INTO facility_type (facility_type_pk, facility_type_code)
    VALUES (breeding_type_pk, 'ANIMAL_BREEDING');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Reference code for cattle breeding business activity
  BEGIN
    INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date)
    VALUES (breeding_activity_code_pk, 'CATTLE_BREEDING_DAIRY', 4000, DATE '9999-12-31');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code)
    VALUES (breeding_activity_code_pk, 'Cattle breeding and dairy production', 'ENG');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Facility business activity record
  BEGIN
    INSERT INTO facility_business_activty (
      facility_business_activty_pk,
      facility_type_pk,
      facility_businss_actvty_code
    ) VALUES (
      breeding_activity_pk,
      breeding_type_pk,
      'CATTLE_BREEDING_DAIRY'
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- Reference data for holdings local authority lookups
-- ─────────────────────────────────────────────────────────────────────────────

-- Create a ref_data_set for LOCAL_AUTHORITY (used by holdings)
BEGIN
  INSERT INTO ref_data_set (ref_data_set_pk, ref_data_set_name, effective_to_date)
  VALUES (2000, 'LOCAL_AUTHORITY', NULL);
EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
/

-- Local authority numbers for CPH 98/001/0001 and 98/002/0001
DECLARE
  la_98001_code_pk NUMBER := 101;
  la_98002_code_pk NUMBER := 102;
  parish_98001_code_pk NUMBER := 201;
  parish_98002_code_pk NUMBER := 202;
BEGIN
  -- LA for 98/001 (first 6 chars of CPH)
  BEGIN
    INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date)
    VALUES (la_98001_code_pk, 'LA98001', 2000, DATE '9999-12-31');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code)
    VALUES (la_98001_code_pk, 'Local Authority 98/001', 'ENG');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Parish code for 98/001
  BEGIN
    INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date)
    VALUES (parish_98001_code_pk, '98/001', 2000, DATE '9999-12-31');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Map LA to parish for 98/001
  BEGIN
    INSERT INTO ref_data_code_map (
      ref_data_code_map_pk,
      ref_data_set_map_pk,
      from_ref_data_code_pk,
      to_ref_data_code_pk,
      effective_to_date
    ) VALUES (301, 1, la_98001_code_pk, parish_98001_code_pk, DATE '9999-12-31');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- LA for 98/002 (first 6 chars of CPH)
  BEGIN
    INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date)
    VALUES (la_98002_code_pk, 'LA98002', 2000, DATE '9999-12-31');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO ref_data_code_desc (ref_data_code_pk, short_description, language_code)
    VALUES (la_98002_code_pk, 'Local Authority 98/002', 'ENG');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Parish code for 98/002
  BEGIN
    INSERT INTO ref_data_code (ref_data_code_pk, code, ref_data_set_pk, effective_to_date)
    VALUES (parish_98002_code_pk, '98/002', 2000, DATE '9999-12-31');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Map LA to parish for 98/002
  BEGIN
    INSERT INTO ref_data_code_map (
      ref_data_code_map_pk,
      ref_data_set_map_pk,
      from_ref_data_code_pk,
      to_ref_data_code_pk,
      effective_to_date
    ) VALUES (302, 1, la_98002_code_pk, parish_98002_code_pk, DATE '9999-12-31');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;
END;
/

COMMIT;

DECLARE
  first_location_feature_pk NUMBER := 91001;
  second_location_feature_pk NUMBER := 91002;

  first_address_pk NUMBER := 92001;
  second_address_pk NUMBER := 92002;

  first_livestock_asset_pk NUMBER := 93001;
  first_livestock_animal_pk NUMBER := 93001001;
  first_facility_asset_pk NUMBER := 93002;
  second_livestock_asset_pk NUMBER := 93003;
  second_livestock_animal_pk NUMBER := 93003001;

BEGIN
  -- ─────────────────────────────────────────────────────────────────────────────
  -- Location L98001 with address, livestock unit, and facility
  -- ─────────────────────────────────────────────────────────────────────────────

  -- Create feature record with name
  BEGIN
    INSERT INTO feature (feature_pk, feature_name)
    VALUES (first_location_feature_pk, 'Test Farm Location');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create location
  BEGIN
    INSERT INTO location (feature_pk, location_id)
    VALUES (first_location_feature_pk, 'L98001');
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

  -- Create ANIMAL linked to ANIMAL_SPECIES (CATTLE)
  BEGIN
    INSERT INTO animal (animal_pk, animal_species_pk)
    VALUES (first_livestock_animal_pk, 2001); -- 2001 is CATTLE species_pk
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create livestock unit asset
  BEGIN
    INSERT INTO asset (
      asset_pk,
      animal_pk
    ) VALUES (
      first_livestock_asset_pk,
      first_livestock_animal_pk
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO livestock_unit (
      asset_pk,
      unit_id
    ) VALUES (
      first_livestock_asset_pk,
      'LU98001001'
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
      first_livestock_animal_pk,
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
      unit_id,
      facility_name,
      facility_business_activty_pk
    ) VALUES (
      first_facility_asset_pk,
      'F98001001',
      'Main Cattle Facility',
      6001  -- Links to CATTLE_BREEDING_DAIRY business activity
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
  -- Location L98002 with address and livestock unit only
  -- ─────────────────────────────────────────────────────────────────────────────

  -- Create feature record with name
  BEGIN
    INSERT INTO feature (feature_pk, feature_name)
    VALUES (second_location_feature_pk, 'Highland Farm');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create location
  BEGIN
    INSERT INTO location (feature_pk, location_id)
    VALUES (second_location_feature_pk, 'L98002');
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

  -- Create ANIMAL linked to ANIMAL_SPECIES (SHEEP)
  BEGIN
    INSERT INTO animal (animal_pk, animal_species_pk)
    VALUES (second_livestock_animal_pk, 2002); -- 2002 is SHEEP species_pk
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create livestock unit asset
  BEGIN
    INSERT INTO asset (
      asset_pk,
      animal_pk
    ) VALUES (
      second_livestock_asset_pk,
      second_livestock_animal_pk
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  BEGIN
    INSERT INTO livestock_unit (
      asset_pk,
      unit_id
    ) VALUES (
      second_livestock_asset_pk,
      'LU98002001'
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
      second_livestock_animal_pk,
      100
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

END;
/

-- ─────────────────────────────────────────────────────────────────────────────
-- Add CPH holdings that link to the test locations
-- ─────────────────────────────────────────────────────────────────────────────

DECLARE
  first_location_feature_pk NUMBER := 91001;
  second_location_feature_pk NUMBER := 91002;

  first_party_pk NUMBER := 94001;
  first_party_role_pk NUMBER := 94001001;
  second_party_pk NUMBER := 94002;
  second_party_role_pk NUMBER := 94002001;
BEGIN
  -- ─────────────────────────────────────────────────────────────────────────────
  -- CPH 98/001/0001 linked to location L98001
  -- ─────────────────────────────────────────────────────────────────────────────

  -- Create CPH record
  BEGIN
    INSERT INTO v_cph_customer_unit (cph, cph_type)
    VALUES ('98/001/0001', 'HOLDER_TEST');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create party (customer) for the holding
  BEGIN
    INSERT INTO party (party_pk, party_id)
    VALUES (first_party_pk, 'CUST-98001');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create party role
  BEGIN
    INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date)
    VALUES (first_party_role_pk, first_party_pk, NULL);
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create party state (ACTIVE)
  MERGE INTO party_state party_state_record
  USING (
    SELECT first_party_pk AS party_pk,
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

  -- Create feature involvement (links CPH to location)
  BEGIN
    INSERT INTO feature_involvement (
      feature_pk,
      cph,
      feature_involvement_type,
      feature_involv_to_date,
      party_role_pk
    ) VALUES (
      first_location_feature_pk,
      '98/001/0001',
      'CPHHOLDERSHIP',
      NULL,
      first_party_role_pk
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- ─────────────────────────────────────────────────────────────────────────────
  -- CPH 98/002/0001 linked to location L98002
  -- ─────────────────────────────────────────────────────────────────────────────

  -- Create CPH record
  BEGIN
    INSERT INTO v_cph_customer_unit (cph, cph_type)
    VALUES ('98/002/0001', 'HOLDER_TEST');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create party (customer) for the holding
  BEGIN
    INSERT INTO party (party_pk, party_id)
    VALUES (second_party_pk, 'CUST-98002');
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create party role
  BEGIN
    INSERT INTO party_role (party_role_pk, party_pk, party_role_to_date)
    VALUES (second_party_role_pk, second_party_pk, NULL);
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

  -- Create party state (ACTIVE)
  MERGE INTO party_state party_state_record
  USING (
    SELECT second_party_pk AS party_pk,
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

  -- Create feature involvement (links CPH to location)
  BEGIN
    INSERT INTO feature_involvement (
      feature_pk,
      cph,
      feature_involvement_type,
      feature_involv_to_date,
      party_role_pk
    ) VALUES (
      second_location_feature_pk,
      '98/002/0001',
      'CPHHOLDERSHIP',
      NULL,
      second_party_role_pk
    );
  EXCEPTION WHEN DUP_VAL_ON_INDEX THEN NULL; END;

END;
/

COMMIT;

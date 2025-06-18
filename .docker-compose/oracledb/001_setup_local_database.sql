-- Connect to the default pluggable database
ALTER SESSION SET CONTAINER=FREEPDB1;

-- Create schema/user 'sam' and grant DBA privileges
CREATE USER sam IDENTIFIED BY "password";
GRANT CONNECT, RESOURCE, DBA TO sam;

-- Create schema/user 'pega' and grant DBA privileges
CREATE USER pega IDENTIFIED BY "password";
GRANT CONNECT, RESOURCE, DBA TO pega;

-- Create schema/user 'ahbrp' (required!) and grant DBA privileges
CREATE USER ahbrp IDENTIFIED BY "password";
GRANT CONNECT, RESOURCE, DBA TO ahbrp;

-- Connect as 'ahbrp' user to create the table explicitly
CONNECT ahbrp/password@FREEPDB1;

CREATE TABLE v_cph_customer_unit (
  cph VARCHAR2(50) NOT NULL,
  location_id VARCHAR2(50),
  feature_name VARCHAR2(255),
  main_role_type VARCHAR2(100),
  person_family_name VARCHAR2(100),
  person_given_name VARCHAR2(100),
  organisation_name VARCHAR2(255),
  party_id VARCHAR2(50),
  asset_id VARCHAR2(50),
  asset_location_type VARCHAR2(50),
  asset_type VARCHAR2(50),
  animal_species_code VARCHAR2(50),
  animal_group_id_mch_ext_ref VARCHAR2(100),
  animal_group_id_mch_frm_dat DATE,
  animal_group_id_mch_to_dat DATE,
  animal_production_usage_code VARCHAR2(50),
  asset_involvement_type VARCHAR2(50),
  cph_type VARCHAR2(50),
  herdmark VARCHAR2(50),
  keeper_of_unit VARCHAR2(100),
  property_number VARCHAR2(50),
  postcode VARCHAR2(20),
  owner_of_unit VARCHAR2(100),
  PRIMARY KEY (cph)
);

-- Insert sample data
INSERT INTO v_cph_customer_unit (cph, location_id, feature_name, main_role_type, person_family_name, person_given_name, organisation_name, party_id, asset_id, asset_location_type, asset_type, animal_species_code, animal_group_id_mch_ext_ref, animal_group_id_mch_frm_dat, animal_group_id_mch_to_dat, animal_production_usage_code, asset_involvement_type, cph_type, herdmark, keeper_of_unit, property_number, postcode, owner_of_unit) VALUES
('01/02/03', 'LOC001', 'Feature A', 'Role1', 'Smith', 'John', 'Org1', 'P001', 'A001', 'Type1', 'Asset1', 'AS001', 'Ref001', TO_DATE('2021-01-01', 'YYYY-MM-DD'), TO_DATE('2021-12-31', 'YYYY-MM-DD'), 'Usage1', 'Involvement1', 'TypeA', 'HM001', 'Keeper1', 'PN001', 'AB12 3CD', 'Owner1'),
('04/05/06', 'LOC002', 'Feature B', 'Role2', 'Doe', 'Jane', 'Org2', 'P002', 'A002', 'Type2', 'Asset2', 'AS002', 'Ref002', TO_DATE('2022-01-01', 'YYYY-MM-DD'), TO_DATE('2022-12-31', 'YYYY-MM-DD'), 'Usage2', 'Involvement2', 'TypeB', 'HM002', 'Keeper2', 'PN002', 'EF45 6GH', 'Owner2'),
('07/08/09', 'LOC003', 'Feature C', 'Role3', 'Brown', 'Charlie', 'Org3', 'P003', 'A003', 'Type3', 'Asset3', 'AS003', 'Ref003', TO_DATE('2023-01-01', 'YYYY-MM-DD'), TO_DATE('2023-12-31', 'YYYY-MM-DD'), 'Usage3', 'Involvement3', 'TypeC', 'HM003', 'Keeper3', 'PN003', 'IJ78 9KL', 'Owner3');

-- Add indexes
CREATE INDEX idx_location_id ON v_cph_customer_unit (location_id);
CREATE INDEX idx_postcode ON v_cph_customer_unit (postcode);

-- Reconnect as SYS or privileged user to grant access
CONNECT sys/password@FREEPDB1 AS SYSDBA;

--- Grant privileges to the user 'sam'
GRANT SELECT ON ahbrp.v_cph_customer_unit TO sam;
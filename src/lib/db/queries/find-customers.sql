SELECT
party.party_id,
party.party_pk,
per.title,
per.first_name,
per.second_name,
per.last_name,
org.organisation_name,
org.primary_contact_full_name,
org.secondary_contact_full_name,
address_usage.address_usage_type,
address_usage.preferred_contact_method_ind,
paon_start_number,
paon_start_number_suffix,
paon_end_number,
paon_end_number_suffix,
paon_description,
saon_description,
saon_start_number,
saon_start_number_suffix,
saon_end_number,
saon_end_number_suffix,
street,
locality,
town,
county_lookup.short_description county,
postcode,
uk_internal_code,
country_code,
mobile.mobile_number,
mobile.preferred_contact_method_ind mobile_preferred_ind,
landline.telephone_number landline,
landline.preferred_contact_method_ind landline_preferred_ind,
email.internet_email_address email,
email.preferred_contact_method_ind email_preferred_ind,
alt_party_identity_value srabpi_plantid,
(
  CASE
    WHEN per.customer_type IS NOT NULL THEN per.customer_type
    ELSE org.customer_type
  END
) customer_type

FROM
ahbrp.party,
ahbrp.party_state,
ahbrp.party_contact_address,
ahbrp.address,
ahbrp.bs7666_address,
ahbrp.address_usage,
ahbrp.alt_party_identity,

(
  SELECT
  party.party_pk,
  INITCAP(person_title) title,
  person_given_name first_name,
  person_given_name2 second_name,
  person_family_name last_name,
  'PERSON' customer_type

  FROM
  ahbrp.party,
  ahbrp.person,
  ahbrp.party_version

  WHERE
  party.party_pk = person.party_pk
  AND
  party.party_pk = party_version.party_pk
  AND
  party_version.party_type = 'PERSON'
  AND
  party_version.party_version_to_datetime = '31-DEC-9999'
) per,

(
  SELECT
  party.party_pk,
  organisation_name,
  primary_contact_full_name,
  party.secondary_contact_full_name,
  'ORGANISATION' customer_type

  FROM
  ahbrp.party,
  ahbrp.organisation,
  ahbrp.party_version

  WHERE
  party.party_pk = organisation.party_pk
  AND
  party.party_pk = party_version.party_pk
  AND
  party_version.party_type = 'ORGANISATION'
  AND
  party_version.party_version_to_datetime = '31-DEC-9999'
) org,

(
  SELECT
  mobile_number,
  preferred_contact_method_ind,
  party.party_pk

  FROM
  ahbrp.party_contact_address pcam,
  ahbrp.telecom_address,
  ahbrp.address_usage mobile_usage,
  ahbrp.party

  WHERE
  party.party_pk = pcam.party_pk(+)
  AND
  pcam.telecom_address_pk = telecom_address.telecom_address_pk(+)
  AND
  pcam.party_contact_address_pk = mobile_usage.party_contact_address_pk(+)
  AND
  pcam.telecom_address_pk(+) IS NOT NULL
  AND
  pcam.party_contact_to_date(+) IS NULL
  AND
  telecom_address.telecom_address_type = 'MOBILE'
  AND
  telecom_address.telecom_address_to_date(+) IS NULL
  AND
  mobile_usage.address_usage_to_date(+) IS NULL
) mobile,

(
  SELECT
  telephone_number,
  preferred_contact_method_ind,
  party.party_pk

  FROM
  ahbrp.party_contact_address pcal,
  ahbrp.telecom_address,
  ahbrp.address_usage landline_usage,
  ahbrp.party

  WHERE
  party.party_pk = pcal.party_pk(+)
  AND
  pcal.telecom_address_pk = telecom_address.telecom_address_pk(+)
  AND
  pcal.party_contact_address_pk = landline_usage.party_contact_address_pk(+)
  AND
  pcal.telecom_address_pk(+) IS NOT NULL
  AND
  pcal.party_contact_to_date(+) IS NULL
  AND
  telecom_address.telecom_address_type = 'LANDLINE'
  AND
  telecom_address.telecom_address_to_date(+) IS NULL
  AND
  landline_usage.address_usage_to_date(+) IS NULL
) landline,

(
  SELECT
  internet_email_address,
  preferred_contact_method_ind,
  party.party_pk

  FROM
  ahbrp.party_contact_address pcae,
  ahbrp.telecom_address,
  ahbrp.address_usage email_usage,
  ahbrp.party

  WHERE
  party.party_pk = pcae.party_pk(+)
  AND
  pcae.telecom_address_pk = telecom_address.telecom_address_pk(+)
  AND
  pcae.party_contact_address_pk = email_usage.party_contact_address_pk(+)
  AND
  pcae.telecom_address_pk(+) IS NOT NULL
  AND
  pcae.party_contact_to_date(+) IS NULL
  AND
  telecom_address.telecom_address_type = 'EMAIL'
  AND
  telecom_address.telecom_address_to_date(+) IS NULL
  AND
  email_usage.address_usage_to_date(+) IS NULL
) email,

(
  SELECT DISTINCT
  RDC.CODE,
  RDCD.SHORT_DESCRIPTION

  FROM
  AHBRP.REF_DATA_SET RDS,
  AHBRP.REF_DATA_CODE RDC,
  AHBRP.REF_DATA_CODE_DESC RDCD

  WHERE
  RDS.REF_DATA_SET_NAME = 'COUNTY'
  AND
  RDS.EFFECTIVE_TO_DATE IS NULL
  AND
  RDS.REF_DATA_SET_PK = RDC.REF_DATA_SET_PK
  AND
  RDC.EFFECTIVE_TO_DATE = '31-DEC-9999'
  AND
  RDC.REF_DATA_CODE_PK = RDCD.REF_DATA_CODE_PK
  AND
  RDCD.LANGUAGE_CODE = 'ENG'
) county_lookup

WHERE
party.party_pk = party_state.party_pk
AND
party.party_pk = party_contact_address.party_pk(+)
AND
party_contact_address.address_pk = address.address_pk(+)
AND
address.address_pk = bs7666_address.address_pk(+)
AND
party_contact_address.party_contact_address_pk = address_usage.party_contact_address_pk(+)
AND
party.party_pk = per.party_pk(+)
AND
party.party_pk = org.party_pk(+)
AND
party.party_pk = mobile.party_pk(+)
AND
party.party_pk = landline.party_pk(+)
AND
party.party_pk = email.party_pk(+)
AND
bs7666_address.administrative_area = county_lookup.code(+)
AND
party_state.party_status_code != 'INACTIVE'
AND
party_state.party_state_to_dttm IS NULL
AND
party_contact_address.address_pk(+) IS NOT NULL
AND
party_contact_address.party_contact_to_date(+) IS NULL
AND
address.address_to_date(+) IS NULL
AND
address_usage.address_usage_to_date(+) IS NULL
AND
party.party_pk = alt_party_identity.party_pk(+)
AND
alt_party_identity_type(+) = 'SRABPIPLANTID'
AND
(
  (__CUSTOMER_TYPE__ = 'PERSON' AND per.party_pk IS NOT NULL)
  OR
  (__CUSTOMER_TYPE__ = 'ORGANISATION' AND org.party_pk IS NOT NULL)
)
AND
party.party_id IN (__CUSTOMER_IDS__)

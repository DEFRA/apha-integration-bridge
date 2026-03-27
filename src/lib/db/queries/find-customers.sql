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
administrative_area county,
postcode,
uk_internal_code,
country_code,
telecom.mobile_number,
telecom.mobile_preferred_ind,
telecom.landline,
telecom.landline_preferred_ind,
telecom.email,
telecom.email_preferred_ind,
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
  party.party_pk,
  MAX(
    CASE
      WHEN telecom_address.telecom_address_type = 'MOBILE' THEN telecom_address.mobile_number
    END
  ) mobile_number,
  MAX(
    CASE
      WHEN telecom_address.telecom_address_type = 'MOBILE' THEN telecom_usage.preferred_contact_method_ind
    END
  ) mobile_preferred_ind,
  MAX(
    CASE
      WHEN telecom_address.telecom_address_type = 'LANDLINE' THEN telecom_address.telephone_number
    END
  ) landline,
  MAX(
    CASE
      WHEN telecom_address.telecom_address_type = 'LANDLINE' THEN telecom_usage.preferred_contact_method_ind
    END
  ) landline_preferred_ind,
  MAX(
    CASE
      WHEN telecom_address.telecom_address_type = 'EMAIL' THEN telecom_address.internet_email_address
    END
  ) email,
  MAX(
    CASE
      WHEN telecom_address.telecom_address_type = 'EMAIL' THEN telecom_usage.preferred_contact_method_ind
    END
  ) email_preferred_ind

  FROM
  ahbrp.party_contact_address pcat,
  ahbrp.telecom_address,
  ahbrp.address_usage telecom_usage,
  ahbrp.party

  WHERE
  party.party_pk = pcat.party_pk(+)
  AND
  pcat.telecom_address_pk = telecom_address.telecom_address_pk(+)
  AND
  pcat.party_contact_address_pk = telecom_usage.party_contact_address_pk(+)
  AND
  pcat.telecom_address_pk(+) IS NOT NULL
  AND
  pcat.party_contact_to_date(+) IS NULL
  AND
  telecom_address.telecom_address_type IN ('MOBILE', 'LANDLINE', 'EMAIL')
  AND
  telecom_address.telecom_address_to_date(+) IS NULL
  AND
  telecom_usage.address_usage_to_date(+) IS NULL

  GROUP BY
  party.party_pk
) telecom

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
party.party_pk = telecom.party_pk(+)
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
__CUSTOMER_TYPE_FILTER__
AND
party.party_id IN (__CUSTOMER_IDS__)

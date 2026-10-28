# Changelog

Changes to values returned by the v1 API (`application/vnd.apha.1+json`).

## Unreleased

### Changed

- `GET /locations/{locationId}`: `address.administrativeAreaCounty` is now the decoded county name from SAM's COUNTY reference data (for example `Devon`), matching `POST /locations/find`. It was previously the raw `ADMINISTRATIVE_AREA` code. It is `null` when the code has no description.
- `GET /locations/{locationId}`: without the `pii` scope, `address.locality` and `address.administrativeAreaCounty` are now masked, as `street`, `town` and `postcode` already were. This matches the structured address on the find endpoints.
- `POST /customers/find`: a phone number or email address recorded under more than one SAM address usage type now appears once per usage type, labelled by `usageType`. It previously appeared once, so a number recorded for a named secondary contact could not be told apart from the customer's own.
- `POST /customers/find`: without the `pii` scope, two different numbers that mask to the same string (for example `07700 900301` and `07700 900311`) are now both returned. Previously duplicates were removed after masking, so one was dropped.
- `POST /customers/find`: `contactDetails` now includes contacts held through one of the customer's current roles, as `GET /holdings/{countyId}/{parishId}/{holdingId}/parties` does.
- `POST /customers/find`: `contactDetails` entries are now in the order SAM recorded them. Previously the order was not defined.
- `POST /organisations/find`: if an organisation has more than one mobile, landline or email, `contactDetails.primaryContact.phoneNumber` and `contactDetails.secondaryContact.emailAddress` now use the earliest recorded. Previously the choice was not defined.

### Added

- `POST /customers/find`: each `contactDetails` entry has `usageType`, the SAM `ADDRESS_USAGE_TYPE` recorded for that contact, or `null`.
- `POST /customers/find`: `partyType`, always `PERSON`.
- `POST /customers/find`: `roles` (`mainRoleType`, `roleType`, `roleName`, `from`).
- `POST /customers/find`: fax entries in `contactDetails` (`type: fax`, `faxNumber`).
- `POST /organisations/find`: `organisationType` (for example `NOTKNOWN`, or `AHORGUNIT` for a Defra organisational unit).
- `POST /organisations/find`: `roles`, as on `POST /customers/find`.
- `POST /organisations/find`: `contactMethods`, with the same entries as `contactDetails` on `POST /customers/find`.

### Documentation

- `address.countryCode` on `POST /locations/find`, `POST /customers/find` and `POST /organisations/find` is documented as SAM's `UK_INTERNAL_CODE` (`England`, `Scotland`, `Wales`, `Northern Ireland`, `Isle of Man` or `null`). The value is unchanged.
- `GET /locations/{locationId}` documents that its `countryCode` is SAM's `COUNTRY_CODE` (`England`, `GB` or `Wales`), so it differs from `countryCode` on the find endpoints; `ukInternalCode` is the comparable field. The value is unchanged; the mismatch is tracked separately.
- `GET /holdings/{countyId}/{parishId}/{holdingId}` documents what a `409 DUPLICATE_RESOURCES_FOUND` means.

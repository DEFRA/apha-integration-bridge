# Changelog

Changes to values returned by the v1 API (`application/vnd.apha.1+json`).

## Unreleased

### Changed

- `GET /locations/{locationId}`: `address.administrativeAreaCounty` is now the decoded county name from SAM's COUNTY reference data (for example `Devon`), matching `POST /locations/find`. It was previously the raw `ADMINISTRATIVE_AREA` code. It is `null` when the code has no description.
- `GET /locations/{locationId}`: without the `pii` scope, `address.locality` and `address.administrativeAreaCounty` are now masked, as `street`, `town` and `postcode` already were. This matches the structured address on the find endpoints.
- `POST /customers/find`: a phone number or email address recorded under more than one SAM address usage type now appears once per usage type, labelled by `usageType`. It previously appeared once, so a number recorded for a named secondary contact could not be told apart from the customer's own.

### Added

- `POST /customers/find`: each `contactDetails` entry has `usageType`, the SAM `ADDRESS_USAGE_TYPE` recorded for that contact, or `null`.

### Documentation

- `address.countryCode` on `POST /locations/find`, `POST /customers/find` and `POST /organisations/find` is documented as SAM's `UK_INTERNAL_CODE` (`England`, `Scotland`, `Wales`, `Northern Ireland`, `Isle of Man` or `null`). The value is unchanged.
- `GET /locations/{locationId}` documents that its `countryCode` is SAM's `COUNTRY_CODE` (`England`, `GB` or `Wales`), so it differs from `countryCode` on the find endpoints; `ukInternalCode` is the comparable field. The value is unchanged; the mismatch is tracked separately.
- `GET /holdings/{countyId}/{parishId}/{holdingId}` documents what a `409 DUPLICATE_RESOURCES_FOUND` means.

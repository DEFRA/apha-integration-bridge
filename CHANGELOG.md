# Changelog

Changes to values returned by the v1 API (`application/vnd.apha.1+json`).

## Unreleased

### Documentation

- `address.countryCode` on `POST /locations/find`, `POST /customers/find` and `POST /organisations/find` is documented as SAM's `UK_INTERNAL_CODE` (`England`, `Scotland`, `Wales`, `Northern Ireland`, `Isle of Man` or `null`). The value is unchanged.
- `GET /locations/{locationId}` documents that its `countryCode` is SAM's `COUNTRY_CODE` (`England`, `GB` or `Wales`), so it differs from `countryCode` on the find endpoints; `ukInternalCode` is the comparable field. The value is unchanged; the mismatch is tracked separately.
- `GET /holdings/{countyId}/{parishId}/{holdingId}` documents what a `409 DUPLICATE_RESOURCES_FOUND` means.

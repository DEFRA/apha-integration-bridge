# GET /holdings/{countyId}/{parishId}/{holdingId}/suppliers

Use this endpoint to find the Official Veterinarian practice and the Delivery Partner responsible for each livestock unit at a CPH's locations.

## What this endpoint does

- Works from the CPH's active holderships, the same ones `GET /holdings/{countyId}/{parishId}/{holdingId}/locations` lists.
- For each livestock unit whose current primary location is one of their locations, returns its current Official Veterinarian practice (`OVFOR`) and Delivery Partner (`DPFOR`). SAM gives `OVFOR` only to OV practices (`OVPRACTICE`) and `DPFOR` only to Delivery Partners (`DELIVERYPARTNER`), so the vet for a unit is always a practice, never an individual vet.
- Returns each supplier once, with one `involvements` entry for each of its current involvements with a unit at a location. A location held under two CPHs shares its units, so the same suppliers appear under both.
- Returns `200` with `data: []` when the locations have no livestock units, or none with a current supplier.
- The list is not paginated.

## Authentication and headers

- `Authorization: Bearer <token>` is required.
- `Accept: application/vnd.apha.1+json` is supported.
- Without the `pii` scope, `title`, `firstName`, `lastName` and `organisationName` are masked, as on `/parties`.

## Path parameters

| Parameter   | Type   | Required | Rules            |
| ----------- | ------ | -------- | ---------------- |
| `countyId`  | string | Yes      | Exactly 2 digits |
| `parishId`  | string | Yes      | Exactly 3 digits |
| `holdingId` | string | Yes      | Exactly 4 digits |

Example request:

```bash
curl -X GET \
  'https://<host>/holdings/12/345/6789/suppliers' \
  -H 'Authorization: Bearer <token>' \
  -H 'Accept: application/vnd.apha.1+json'
```

## Success response (`200 OK`)

Each supplier has the shape of the alpha supplier search:

- `id`: SAM customer id; `partyType`: `PERSON` or `ORGANISATION` (`null` when SAM records no current version of the party).
- `supplierTypes`: the SAM supplier role types behind its involvements, `OVPRACTICE` or `DELIVERYPARTNER`.
- `title`, `firstName`, `lastName` for a person, `organisationName` for an organisation; the other set is `null`.
- `involvements`: `involvementType` (`OVFOR` or `DPFOR`), `locationId`, `livestockUnitId` and `from`.

Example:

```json
{
  "data": [
    {
      "type": "suppliers",
      "id": "C1049182",
      "supplierTypes": ["OVPRACTICE"],
      "partyType": "ORGANISATION",
      "title": null,
      "firstName": null,
      "lastName": null,
      "organisationName": "Wheelwright Veterinary Group",
      "involvements": [
        {
          "involvementType": "OVFOR",
          "locationId": "L97339",
          "livestockUnitId": "U000010",
          "from": "2019-05-01"
        }
      ]
    },
    {
      "type": "suppliers",
      "id": "C1031007",
      "supplierTypes": ["DELIVERYPARTNER"],
      "partyType": "ORGANISATION",
      "title": null,
      "firstName": null,
      "lastName": null,
      "organisationName": "Midlands Veterinary Delivery Partnership",
      "involvements": [
        {
          "involvementType": "DPFOR",
          "locationId": "L97339",
          "livestockUnitId": "U000010",
          "from": "2022-01-01"
        }
      ]
    }
  ],
  "links": {
    "self": "/holdings/12/345/6789/suppliers"
  }
}
```

## Error responses

| Status | When it happens                  | Typical code                               |
| ------ | -------------------------------- | ------------------------------------------ |
| `400`  | Invalid path parameter format    | `BAD_REQUEST` / `VALIDATION_ERROR`         |
| `401`  | Missing or invalid bearer token  | Unauthorized by auth layer                 |
| `404`  | The CPH has no active holdership | `NOT_FOUND`                                |
| `404`  | `Accept` names a version above 1 | `UNSUPPORTED_VERSION`                      |
| `500`  | Unexpected backend failure       | `INTERNAL_SERVER_ERROR` / `DATABASE_ERROR` |

## How this relates to `GET /holdings/{countyId}/{parishId}/{holdingId}`

- Both return `404` for the same CPHs: those with no active holdership.
- That endpoint returns `409 DUPLICATE_RESOURCES_FOUND` for a CPH with several current holderships; this one covers the locations of every one of them.

## Practical tips

- Be a tolerant reader: ignore fields you do not recognise and do not depend on key order. Fields are only ever added under `application/vnd.apha.1+json`.
- `locationId` and `livestockUnitId` are the ids `/locations` uses. Both endpoints leave out a unit whose primary location has an end date, even one in the future.

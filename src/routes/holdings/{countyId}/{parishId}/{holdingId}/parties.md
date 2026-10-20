# GET /holdings/{countyId}/{parishId}/{holdingId}/parties

Use this endpoint to get everyone involved with a CPH: the holders, the land owners and the keepers, as full party records.

## What this endpoint does

- Works from the CPH's active holderships, the same ones `GET /holdings/{countyId}/{parishId}/{holdingId}/locations` lists.
- Returns each party once: the holder of each holdership, whoever SAM records as owner of place (or the owner's agent) of each of their locations, and everyone keeping or owning a livestock unit at those locations.
- Gives each party one `involvements` entry per involvement. A party holding two holderships who also owns the land has two `holder` entries and one `landOwner` entry. Holding a CPH does not make a party a keeper: no `keeper` entry is inferred from a holdership.
- The list is not paginated.

## Authentication and headers

- `Authorization: Bearer <token>` is required.
- `Accept: application/vnd.apha.1+json` is supported.
- Without the `pii` scope, names, organisation names, street, locality, town, county, postcode, phone numbers and e-mail addresses are masked. Contact entries are de-duplicated before masking, so a masked client still receives every entry.

## Path parameters

| Parameter   | Type   | Required | Rules            |
| ----------- | ------ | -------- | ---------------- |
| `countyId`  | string | Yes      | Exactly 2 digits |
| `parishId`  | string | Yes      | Exactly 3 digits |
| `holdingId` | string | Yes      | Exactly 4 digits |

Example request:

```bash
curl -X GET \
  'https://<host>/holdings/12/345/6789/parties' \
  -H 'Authorization: Bearer <token>' \
  -H 'Accept: application/vnd.apha.1+json'
```

## Success response (`200 OK`)

A person and an organisation share one flat shape. `partyType` (`PERSON` or `ORGANISATION`) says which fields apply; the other set is `null`:

- Persons: `title` (`Unknown` when SAM has none), `firstName`, `middleName`, `lastName`.
- Organisations: `organisationName`, `organisationType` (SAM's code; `AHORGUNIT` marks one of Defra's own units, most are `NOTKNOWN`) and `namedContacts`: the names of SAM's primary and secondary contacts. SAM records no number or e-mail for them, so those members are `null`. The organisation's own phone numbers and e-mail addresses are in `contactMethods`; `POST /organisations/find` copies them into its `contactDetails` instead.

`partyType` and every name field are `null` for a party SAM records no current version for. The name fields are also `null` for a party SAM stores without the name it requires (a family name or an organisation name).

Every party also has:

- `roles`: every current SAM role the party holds, not only the one behind its involvement (`mainRoleType`, `roleType`, `roleName`, `from`).
- `addresses`: every current postal address (its link and the address have both started and not ended), with SAM's `isPreferred`. `countryCode` is the UK nation or Crown Dependency (SAM's `UK_INTERNAL_CODE`), as `POST /customers/find` returns it, and `ukInternalCode` repeats it.
- `contactMethods`: every current e-mail, mobile, landline and fax entry, with `isPreferred` and `usageType` (`null` where SAM records none).
- `involvements`: `role`, `involvementType` and `locationId` are always set; the other members are `null` where they do not apply:
  - `holder` (`CPHHOLDERSHIP`): `vetnetCoreId`, which pairs the entry with an item of `/locations`, `from`, and `selected`, `true` on the holdership `POST /holdings/find` reports.
  - `landOwner` (`OWNEROFLOCATION`): `status`, `lastChecked` and `from`. SAM does not maintain owner-of-place records on an ongoing basis, and the party may be the owner's agent.
  - `keeper` (`PRIMARYKEEPEROF`, `SECONDARYKEEPEROF` or `OWNEROF`): `livestockUnitId`, `status` (the keepership status, or for an owner the ownership status) and `from`.

Example (trimmed):

```json
{
  "data": [
    {
      "type": "parties",
      "id": "C1012565",
      "partyType": "PERSON",
      "title": "Mr",
      "firstName": "Robert",
      "middleName": null,
      "lastName": "Hartley",
      "organisationName": null,
      "organisationType": null,
      "namedContacts": null,
      "roles": [
        {
          "mainRoleType": "CUSTOMER",
          "roleType": "CPHHOLDER",
          "roleName": "CPH Holder",
          "from": "2015-01-01"
        }
      ],
      "addresses": [],
      "contactMethods": [
        {
          "type": "mobile",
          "phoneNumber": "07700 900000",
          "isPreferred": true,
          "usageType": "HOME"
        }
      ],
      "involvements": [
        {
          "role": "holder",
          "involvementType": "CPHHOLDERSHIP",
          "locationId": "L97339",
          "vetnetCoreId": "4471023",
          "livestockUnitId": null,
          "status": null,
          "lastChecked": null,
          "from": "2019-04-02",
          "selected": true
        },
        {
          "role": "keeper",
          "involvementType": "PRIMARYKEEPEROF",
          "locationId": "L97339",
          "vetnetCoreId": null,
          "livestockUnitId": "U000010",
          "status": "ACTIVE",
          "lastChecked": null,
          "from": "2019-04-02",
          "selected": null
        }
      ]
    }
  ],
  "links": {
    "self": "/holdings/12/345/6789/parties"
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
- That endpoint returns `409 DUPLICATE_RESOURCES_FOUND` for a CPH with several current holderships; this one lists the holder of every one of them.
- Its `cphHolder` reference is always typed `customers`, even for an organisation. Here `partyType` says whether a party resolves through `POST /customers/find` or `POST /organisations/find`.

## Practical tips

- Be a tolerant reader: ignore fields you do not recognise and do not depend on key order. Fields are only ever added under `application/vnd.apha.1+json`.

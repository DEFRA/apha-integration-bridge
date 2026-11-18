# POST /customers/find

Use this endpoint to fetch person customer records by known customer IDs, or to find them by e-mail address.

## What this endpoint does

- Returns customer resources for the IDs you send, or for the customers holding the e-mail address you send.
- Returns only person-type customers.
- For an ID search, preserves your request order.
- Supports pagination over the requested or matching IDs.

## Authentication and headers

- `Authorization: Bearer <token>` is required.
- `Accept: application/vnd.apha.1+json` is supported.
- `Content-Type: application/json` is required.

## Request

### Query parameters

| Parameter  | Type    | Required | Default | Rules                                               |
| ---------- | ------- | -------- | ------- | --------------------------------------------------- |
| `page`     | integer | No       | `1`     | Minimum `1`                                         |
| `pageSize` | integer | No       | `50`    | Minimum `1`, maximum `{{PAGINATION_MAX_PAGE_SIZE}}` |

### JSON body

Send either `ids` or `email`, never both. `surname` and `postcode` are optional and can only be sent with `email`. Any other combination, or any other field, returns `400`.

| Field      | Type             | Required          | Rules                                                     |
| ---------- | ---------------- | ----------------- | --------------------------------------------------------- |
| `ids`      | array of strings | Unless `email`    | At least 1 item; IDs are alphanumeric strings             |
| `email`    | string           | Unless `ids`      | A valid e-mail address, at most 254 characters            |
| `surname`  | string           | No (`email` only) | Not blank, at most 100 characters; any characters allowed |
| `postcode` | string           | No (`email` only) | A valid UK postcode, with or without the space            |

ID search example:

```json
{
  "ids": ["C123456", "C234567"]
}
```

E-mail search example:

```json
{
  "email": "bert.farmer@example.com",
  "surname": "Farmer",
  "postcode": "AB1 2CD"
}
```

## ID search behavior

- If you send mixed IDs, only customer (person) matches are returned.
- Organisation IDs are ignored by this endpoint.
- Unknown IDs are ignored.

## E-mail search behavior

E-mail search needs the `pii` scope; without it the endpoint returns `403`. ID search does not need it.

It returns the customers who hold the e-mail address as a current contact. A customer is returned once, even if they hold the address more than once. Customers are ordered by ID.

Matching is exact after normalisation, which is applied to both your value and the value SAM holds:

| Field      | Normalisation                        | Compared with                                            |
| ---------- | ------------------------------------ | -------------------------------------------------------- |
| `email`    | Surrounding spaces removed; any case | The customer's current e-mail contacts                   |
| `surname`  | Surrounding spaces removed; any case | The customer's current family name                       |
| `postcode` | Any case; all spaces removed         | The postcodes of any of the customer's current addresses |

So `" Bert.Farmer@Example.com "` matches `bert.farmer@example.com`, and `ab12cd` matches `AB1 2CD`. Partial values do not match: `Farm` does not match `Farmer`.

Only active people are searched. Organisations, inactive customers, ended contacts and ended addresses never match.

## Success response (`200 OK`)

Each returned customer can include:

- Identity fields: `id`, `partyType`, `title`, `firstName`, `middleName`, `lastName`
- `addresses`: with preferred flag and structured address objects
- `contactDetails`: email/mobile/landline/fax entries with preferred flag and `usageType`
- `roles`: current SAM roles
- `relationships.srabpiPlants`
- `relationships.organisations`: organisations the customer is currently related to

`partyType` is always `PERSON`.

### Address fields

- `addresses[].county` is the decoded county name (from SAM's `ADMINISTRATIVE_AREA` code), or the value as SAM holds it if that is not a county code.
- `addresses[].countryCode` is SAM's `UK_INTERNAL_CODE`: one of `England`, `Scotland`, `Wales`, `Northern Ireland`, `Isle of Man`, or `null`. It is not SAM's `COUNTRY_CODE`. Note that `GET /locations/{locationId}` returns this value as `ukInternalCode`, and uses `countryCode` for SAM's `COUNTRY_CODE` instead.

### Contact details

`contactDetails` includes every current email, mobile, landline and fax (`faxNumber`) the customer holds directly. Entries are in the order SAM recorded them. Without the `pii` scope every value is masked, after duplicates are removed.

### Contact usage type

Each `contactDetails` entry carries `usageType`: SAM's `ADDRESS_USAGE_TYPE` for that contact, or `null` if none is recorded, for example `HOME`, `CORRESPONDENCE` or `PLACEOFBUSINESS`. A number recorded under more than one usage type appears once per usage type; entries are labelled, not filtered out.

Example contact entry:

```json
{
  "type": "mobile",
  "phoneNumber": "+44 11111 11111",
  "isPreferred": true,
  "usageType": "MOBILE"
}
```

### Roles

Each `roles` entry is a current SAM role: `mainRoleType`, `roleType`, `roleName` (or `null`) and `from` (`YYYY-MM-DD`, or `null`).

### Related organisations

`relationships.organisations` lists the organisations the customer is related to in SAM's `PARTY_RELATIONSHIP`, for example as an employee (`EMPLOYEDBY`) or business partner (`BUSINESSPARTNEROF`). Only current relationships to organisations that are not inactive are included, and each organisation appears once even if it is related more than once. Look the ids up with `POST /organisations/find`. It is empty if there are none.

Example:

```json
{
  "data": [
    {
      "type": "customers",
      "id": "C123456",
      "partyType": "PERSON",
      "title": "Mr",
      "firstName": "Bert",
      "middleName": null,
      "lastName": "Farmer",
      "addresses": [],
      "contactDetails": [],
      "roles": [
        {
          "mainRoleType": "CUSTOMER",
          "roleType": "CPHHOLDER",
          "roleName": "CPH Holder",
          "from": "2015-01-01"
        }
      ],
      "relationships": {
        "srabpiPlants": {
          "data": []
        },
        "organisations": {
          "data": [{ "type": "organisations", "id": "O123456" }]
        }
      }
    }
  ],
  "links": {
    "self": "/customers/find?page=1&pageSize=10",
    "prev": null,
    "next": null
  }
}
```

## Error responses

| Status | When it happens                                                                                            | Typical code                               |
| ------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `400`  | Invalid query/body values (for example `pageSize=0`, both `ids` and `email`, or `surname` without `email`) | `BAD_REQUEST` / `VALIDATION_ERROR`         |
| `401`  | Missing or invalid bearer token                                                                            | Unauthorized by auth layer                 |
| `403`  | E-mail search by a client without the `pii` scope                                                          | `FORBIDDEN`                                |
| `500`  | Unexpected backend failure                                                                                 | `INTERNAL_SERVER_ERROR` / `DATABASE_ERROR` |

## Practical tips

- If you need organisation records, call `POST /organisations/find` instead.
- If you send duplicate IDs, duplicates are removed before pagination.
- Empty result sets, including an e-mail search that matches nobody, return `200` with `data: []`.

# POST /customers/find

Use this endpoint to fetch person customer records by known customer IDs.

## What this endpoint does

- Returns customer resources for the IDs you send.
- Returns only person-type customers.
- Preserves your request order.
- Supports pagination over requested IDs.

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

| Field | Type             | Required | Rules                                         |
| ----- | ---------------- | -------- | --------------------------------------------- |
| `ids` | array of strings | Yes      | At least 1 item; IDs are alphanumeric strings |

Example:

```json
{
  "ids": ["C123456", "C234567"]
}
```

## Filtering behavior

- If you send mixed IDs, only customer (person) matches are returned.
- Organisation IDs are ignored by this endpoint.
- Unknown IDs are ignored.

## Success response (`200 OK`)

Each returned customer can include:

- Identity fields: `id`, `partyType`, `title`, `firstName`, `middleName`, `lastName`
- `addresses`: with preferred flag and structured address objects
- `contactDetails`: email/mobile/landline/fax entries with preferred flag and `usageType`
- `roles`: current SAM roles
- `relationships.srabpiPlants`

`partyType` is always `PERSON`.

### Address fields

- `addresses[].county` is the decoded county name (from SAM's `ADMINISTRATIVE_AREA` code).
- `addresses[].countryCode` is SAM's `UK_INTERNAL_CODE`: one of `England`, `Scotland`, `Wales`, `Northern Ireland`, `Isle of Man`, or `null`. It is not SAM's `COUNTRY_CODE`. Note that `GET /locations/{locationId}` returns this value as `ukInternalCode`, and uses `countryCode` for SAM's `COUNTRY_CODE` instead.

### Contact details

`contactDetails` includes every current email, mobile, landline and fax (`faxNumber`), including contacts held through one of the customer's roles. Entries are in the order SAM recorded them. Without the `pii` scope every value is masked, after duplicates are removed.

### Contact usage type

Each `contactDetails` entry carries `usageType`: SAM's `ADDRESS_USAGE_TYPE` for that contact, or `null` if none is recorded. Use it to tell a number recorded for a named secondary contact apart from the customer's own. A number recorded under more than one usage type appears once per usage type; entries are labelled, not filtered out.

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

| Status | When it happens                                      | Typical code                               |
| ------ | ---------------------------------------------------- | ------------------------------------------ |
| `400`  | Invalid query/body values (for example `pageSize=0`) | `BAD_REQUEST` / `VALIDATION_ERROR`         |
| `401`  | Missing or invalid bearer token                      | Unauthorized by auth layer                 |
| `500`  | Unexpected backend failure                           | `INTERNAL_SERVER_ERROR` / `DATABASE_ERROR` |

## Practical tips

- If you need organisation records, call `POST /organisations/find` instead.
- If you send duplicate IDs, duplicates are removed before pagination.
- Empty result sets return `200` with `data: []`.

# GET /alpha/suppliers/find

**Alpha.** Queries SAM directly. Contract may change without notice.

Search for parties holding a current supplier role in SAM, filtered by
supplier type and, optionally, a "starts with" match on given and/or family
name.

## Query parameters

| Parameter   | Required | Notes                                                                        |
| ----------- | -------- | ---------------------------------------------------------------------------- |
| `type`      | Yes      | Supplier role type. Currently `OVPRACTICE` (Official Veterinarian practice). |
| `firstName` | No       | Given name starts with. Case-insensitive. Letters, spaces, `-`, `'` only.    |
| `lastName`  | No       | Family name starts with. Case-insensitive. Same character rules.             |
| `page`      | No       | Defaults to `1`.                                                             |
| `pageSize`  | No       | Defaults to `10`, maximum `50`.                                              |

Name filters apply to PERSON parties. An ORGANISATION party has no given or
family name, so supplying a name filter excludes organisations from the
result. Omit both name parameters to list every supplier of the type.

Only "starts with" matching is offered. SAM's name indexes are functional
indexes on the upper-cased name, which a prefix match can use and a
"contains" match cannot.

## Example

```
GET /alpha/suppliers/find?type=OVPRACTICE&lastName=Smi&page=1&pageSize=10
```

## Response

```json
{
  "data": [
    {
      "type": "suppliers",
      "id": "P0049182",
      "supplierType": "OVPRACTICE",
      "partyType": "ORGANISATION",
      "title": null,
      "firstName": null,
      "lastName": null,
      "organisationName": "Wheelwright Veterinary Group"
    }
  ],
  "links": {
    "self": "/alpha/suppliers/find?type=OVPRACTICE&lastName=Smi&page=1&pageSize=10",
    "prev": null,
    "next": "/alpha/suppliers/find?type=OVPRACTICE&lastName=Smi&page=2&pageSize=10"
  }
}
```

Both person and organisation name fields are present on every item, with
the inapplicable set `null`. An empty `data` array with a `200` means no
supplier matched; it is not an error.

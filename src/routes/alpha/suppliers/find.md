# GET /alpha/suppliers/find

**Alpha.** Queries SAM directly. Contract may change without notice.

Search for parties holding a current supplier role in SAM, filtered by
supplier type and, optionally, a name fragment.

## Query parameters

| Parameter  | Required | Notes                                                                                                            |
| ---------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `type`     | Yes      | Supplier role type. Currently `OVPRACTICE` (Official Veterinarian practice).                                     |
| `name`     | No       | Name contains. Case-insensitive. Matches given name, family name or organisation name. `%` and `_` are rejected. |
| `page`     | No       | Defaults to `1`.                                                                                                 |
| `pageSize` | No       | Defaults to `10`, maximum `50`.                                                                                  |

A single `name` covers both kinds of party. For a PERSON it is matched
against the given and family names; for an ORGANISATION against the
organisation name. Omit it to list every supplier of the type.

Matching is "contains", not "starts with". The `type` filter bounds the
result set before the name is applied, so the name predicate costs the
same whichever way it is written, and "contains" is the useful one for
organisation names.

## Example

```
GET /alpha/suppliers/find?type=OVPRACTICE&name=wheelwright&page=1&pageSize=10
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
    "self": "/alpha/suppliers/find?type=OVPRACTICE&name=wheelwright&page=1&pageSize=10",
    "prev": null,
    "next": "/alpha/suppliers/find?type=OVPRACTICE&name=wheelwright&page=2&pageSize=10"
  }
}
```

Both person and organisation name fields are present on every item, with
the inapplicable set `null`. An empty `data` array with a `200` means no
supplier matched; it is not an error.

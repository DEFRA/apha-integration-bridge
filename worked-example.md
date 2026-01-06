## Fetch workorder

via find endpoint, hydrated with activities and facilities already.

**Question** - why is there a commodities relationship, where a commodity is only defind with reference to a location?
**Question** - should we preserve the relationship links **even when** we hydrate data?
**Question** - should we hydrate data within the relationships block, or leave that as pure links?

```bash
curl -X 'GET' \
  'http://localhost:5676/workorders?startActivationDate=2026-01-06T11%3A41%3A02.842Z&page=1&pageSize=10' \
  -H 'accept: application/json'
```

```json
{
  "data": [
    {
      "status": "Open",
      "startDate": "2024-01-01T09:00:00+00:00",
      "earliestStartDate": "2024-01-01T09:00:00+00:00",
      "activationDate": "2024-01-05T08:30:00+00:00",
      "purpose": "Initiate Incident Premises Spread Tracing Action",
      "workArea": "Tuberculosis",
      "country": "SCOTLAND",
      "businessArea": "Endemic Notifiable Disease",
      "aim": "Contain / Control / Eradicate Endemic Disease",
      "latestActivityCompletionDate": "2024-01-01T12:00:00+00:00",
      "phase": "EXPOSURETRACKING",
      "activities": [
        {
          "type": "activities",
          "id": "WSA00010",
          "activityName": "Arrange Visit",
          "default": true
        }
      ],
      "type": "workorders",
      "id": "WS-76512",
      "relationships": {
        "customer": {
          "data": {
            "type": "customers",
            "id": "C123456"
          },
          "links": {
            "self": "/workorders/WS-76512/relationships/customer"
          }
        },
        "holding": {
          "data": {
            "type": "holdings",
            "id": "08/139/0167"
          },
          "links": {
            "self": "/workorders/WS-76512/relationships/holding"
          }
        },
        "location": {
          "data": {
            "type": "locations",
            "id": "L123456"
          },
          "links": {
            "self": "/workorders/WS-76512/relationships/location"
          }
        },
        "commodity": {
          "data": {
            "type": "commodities",
            "id": "U000010"
          },
          "links": {
            "self": "/workorders/WS-76512/relationships/commodity"
          }
        },
        "facilities": {
          "data": [
            {
              "type": "facilities",
              "id": "U000030"
            },
            {
              "type": "facilities",
              "id": "U000040"
            }
          ],
          "links": {
            "self": "/workorders/WS-76512/relationships/facilities"
          }
        }
      }
    },
    {
      "status": "Open",
      "startDate": "2024-01-03T09:00:00+00:00",
      "earliestStartDate": "2024-01-01T09:00:00+00:00",
      "activationDate": "2024-01-06T08:30:00+00:00",
      "purpose": "Initiate Incident Premises Spread Tracing Action",
      "workArea": "Tuberculosis",
      "country": "SCOTLAND",
      "businessArea": "Endemic Notifiable Disease",
      "aim": "Contain / Control / Eradicate Endemic Disease",
      "latestActivityCompletionDate": "2024-01-01T12:00:00+00:00",
      "phase": "EXPOSURETRACKING",
      "activities": [
        {
          "type": "activities",
          "id": "WSA00020",
          "activityName": "Carry Out Visit",
          "default": false
        },
        {
          "type": "activities",
          "id": "WSA00030",
          "activityName": "Capture Sample Details",
          "default": true
        }
      ],
      "type": "workorders",
      "id": "WS-76513",
      "relationships": {
        "holding": {
          "data": {
            "type": "holdings",
            "id": "12/123/1234"
          },
          "links": {
            "self": "/workorders/WS-76513/relationships/holding"
          }
        },
        "location": {
          "data": {
            "type": "locations",
            "id": "L234567"
          },
          "links": {
            "self": "/workorders/WS-76513/relationships/location"
          }
        },
        "commodity": {
          "data": {
            "type": "commodities",
            "id": "U000012"
          },
          "links": {
            "self": "/workorders/WS-76513/relationships/commodity"
          }
        },
        "facilities": {
          "data": {
            "type": "facilities",
            "id": "U000040"
          },
          "links": {
            "self": "/workorders/WS-76513/relationships/commodity"
          }
        },
        "customer": {
          "data": {
            "type": "customers",
            "id": "C234567"
          },
          "links": {
            "self": "/workorders/WS-76513/relationships/commodity"
          }
        }
      }
    }
  ],
  "links": {
    "self": "/workorders?startActivationDate=2026-01-06T13%3A05%3A42.985Z&page=1&pageSize=10"
  }
}
```

## fetch holdings (for local authority, mostly)

taking the ids from workorders, fetch all holdings (including local authorities).

```bash
curl -X 'POST' \
  'http://localhost:5676/holdings/find' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "ids": [
    "12/123/1234", "08/139/0167"
  ]
}'
```

```json
{
  "data": [
    {
      "cphType": "PERMANENT",
      "localAuthority": "Lanarkshire",
      "type": "holdings",
      "id": "08/139/0167"
    },
    {
      "cphType": "PERMANENT",
      "localAuthority": "Berkshire",
      "type": "holdings",
      "id": "12/123/1234"
    }
  ],
  "links": {
    "self": "/holdings/find"
  }
}
```

## fetch locations

including:

- relevant livestock units (which can be filtered down by commodity found in work order)
- address (as specced)
- osMapReference
- relevant facilities

- **Question** - is this really the cleanest way to expose address data? (e.g. with nulls, with empty strings, with primary and secondary packed into the same object)

```bash
curl -X 'POST' \
  'http://localhost:5676/locations/find' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "ids": [
    "L123456", "L234567"
  ]
}'
```

```json
{
  "data": [
    {
      "osMapReference": "SO1234567890",
      "address": {
        "paonStartNumber": 12,
        "paonStartNumberSuffix": null,
        "paonEndNumber": null,
        "paonEndNumberSuffix": "",
        "paonDescription": "",
        "saonDescription": "",
        "saonStartNumber": null,
        "saonStartNumberSuffix": null,
        "saonEndNumber": null,
        "saonEndNumberSuffix": "",
        "street": "",
        "locality": null,
        "town": "",
        "administrativeAreaCounty": "",
        "postcode": "",
        "countryCode": ""
      },
      "livestockUnits": [
        {
          "fieldStockNumber": 10,
          "type": "commodities",
          "id": "U000010"
        }
      ],
      "facilities": [
        {
          "type": "facilities",
          "id": "F000010"
        },
        {
          "type": "facilities",
          "id": "F000011"
        }
      ],
      "type": "locations",
      "id": "L123456",
      "relationships": {
        "commodities": {
          "data": {
            "type": "commodities",
            "id": "U000010"
          },
          "links": {
            "self": "/locations/L123456/relationships/commodities"
          }
        },
        "facilities": {
          "data": [
            {
              "type": "facilities",
              "id": "F000011"
            },
            {
              "type": "facilities",
              "id": "F000010"
            }
          ],
          "links": {
            "self": "/locations/L123456/relationships/facilities"
          }
        }
      }
    },
    {
      "osMapReference": "SO1234567890",
      "address": {
        "paonStartNumber": 12,
        "paonStartNumberSuffix": null,
        "paonEndNumber": null,
        "paonEndNumberSuffix": "",
        "paonDescription": "",
        "saonDescription": "",
        "saonStartNumber": null,
        "saonStartNumberSuffix": null,
        "saonEndNumber": null,
        "saonEndNumberSuffix": "",
        "street": "",
        "locality": null,
        "town": "",
        "administrativeAreaCounty": "",
        "postcode": "",
        "countryCode": ""
      },
      "livestockUnits": [
        {
          "fieldStockNumber": 1000,
          "type": "commodities",
          "id": "U000011"
        },
        {
          "type": "commodities",
          "id": "U000012"
        }
      ],
      "facilities": [
        {
          "type": "facilities",
          "id": "F000010"
        },
        {
          "type": "facilities",
          "id": "F000011"
        }
      ],
      "type": "locations",
      "id": "L234567",
      "relationships": {
        "commodities": {
          "data": {
            "type": "commodities",
            "id": "U000011"
          },
          "links": {
            "self": "/locations/L234567/relationships/commodities"
          }
        }
      }
    }
  ],
  "links": {
    "self": "/locations/find"
  }
}
```

## fetch customers

- includes business name, contact details and address

**QUESTION** - is the cardinality of address correct?
**QUESTION** - is this the best way we can represent addresses (see above)

```bash
curl -X 'POST' \
  'http://localhost:5676/customers/find' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "ids": [
    "C123456", "C234567"
  ]
}'
```

```json
{
  "data": [
    {
      "subType": "ORGANISATION",
      "businessName": "Mr and Mrs. M J & S C Pugh",
      "address": {
        "paonStartNumber": 12,
        "paonStartNumberSuffix": null,
        "paonEndNumber": null,
        "paonEndNumberSuffix": "",
        "paonDescription": "",
        "saonDescription": "",
        "saonStartNumber": null,
        "saonStartNumberSuffix": null,
        "saonEndNumber": null,
        "saonEndNumberSuffix": "",
        "street": "",
        "locality": null,
        "town": "",
        "administrativeAreaCounty": "",
        "postcode": "",
        "countryCode": ""
      },
      "contactDetails": {
        "primary": {
          "fullName": "Mr. M J Pugh",
          "emailAddress": "mjpugh@example.com",
          "phoneNumber": "07111 111111"
        },
        "secondary": {
          "fullName": "Mrs. S C Pugh"
        }
      },
      "type": "customers",
      "id": "C123456"
    },
    {
      "subType": "ORGANISATION",
      "businessName": "Barney McGrue",
      "address": {
        "paonStartNumber": 12,
        "paonStartNumberSuffix": null,
        "paonEndNumber": null,
        "paonEndNumberSuffix": "",
        "paonDescription": "",
        "saonDescription": "",
        "saonStartNumber": null,
        "saonStartNumberSuffix": null,
        "saonEndNumber": null,
        "saonEndNumberSuffix": "",
        "street": "",
        "locality": null,
        "town": "",
        "administrativeAreaCounty": "",
        "postcode": "",
        "countryCode": ""
      },
      "contactDetails": {
        "primary": {
          "fullName": "Barney McGrue",
          "emailAddress": "barney@example.com",
          "phoneNumber": "07111 111111"
        }
      },
      "type": "customers",
      "id": "C234567"
    }
  ],
  "links": {
    "self": "/customers/find"
  }
}
```

# POST /locations/find

Retrieve multiple locations by their IDs with pagination support.

## Description

This endpoint allows Work Force Management (WFM) to batch-fetch multiple locations related to work orders. It follows the standard "find" endpoint pattern with pagination support.

## Request

### Headers

- `Authorization`: Bearer token (required)
- `Accept`: `application/vnd.apha.1+json`

### Body

```json
{
  "ids": ["L123", "L456", "L789"]
}
```

- `ids` (required): Array of location ID strings to retrieve

### Query Parameters

- `page` (optional): Page number to retrieve (default: 1, min: 1)
- `pageSize` (optional): Number of items per page (default: 50, min: 1, max: 50)

## Response

### Success Response (200 OK)

```json
{
  "data": [
    {
      "type": "locations",
      "id": "L123",
      "name": "Farm Location Name",
      "address": {
        "primaryAddressableObject": {
          "startNumber": 123,
          "startNumberSuffix": null,
          "endNumber": null,
          "endNumberSuffix": null,
          "description": "Main Building"
        },
        "secondaryAddressableObject": {
          "startNumber": null,
          "startNumberSuffix": null,
          "endNumber": null,
          "endNumberSuffix": null,
          "description": null
        },
        "street": "High Street",
        "locality": "Village Name",
        "town": "Town Name",
        "postcode": "AB12 3CD",
        "countryCode": "GB"
      },
      "osMapReference": "SK123456",
      "livestockUnits": [
        {
          "type": "animal-commodities",
          "id": "LU123",
          "animalQuantities": 50,
          "species": "Cattle"
        }
      ],
      "facilities": [
        {
          "type": "facilities",
          "id": "F456",
          "name": "Dairy Parlour",
          "facilityType": "Dairy",
          "businessActivity": "Milk Production"
        }
      ],
      "relationships": {}
    }
  ],
  "links": {
    "self": "/locations/find?page=1&pageSize=50",
    "prev": null,
    "next": "/locations/find?page=2&pageSize=50"
  }
}
```

### Error Responses

#### 400 Bad Request

Invalid request parameters:

```json
{
  "message": "Validation failed",
  "code": "BAD_REQUEST",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "\"ids\" is required"
    }
  ]
}
```

#### 401 Unauthorized

Missing or invalid authorization token.

#### 404 Not Found

Unsupported API version.

#### 500 Internal Server Error

Database or server error.

## Behavior

### Pagination

- The endpoint paginates the provided list of IDs
- For page 1 with pageSize 3: returns results for IDs at positions 0, 1, 2
- For page 2 with pageSize 3: returns results for IDs at positions 3, 4, 5
- Pagination links in the response indicate available next/previous pages

### Filtering

- Only locations with status "active" are returned

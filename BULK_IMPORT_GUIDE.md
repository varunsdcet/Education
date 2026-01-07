# Bulk Product Import Guide

## How to Import Products from Text

You can import multiple products at once by pasting your product list with prices.

### Method 1: Bulk Import from Text (Recommended)

**Endpoint:** `POST /api/products/bulk-import`  
**Auth:** Required (Bearer token)

```bash
curl -X POST http://localhost:3000/api/products/bulk-import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "Exterior Photos Only (10-15, < 2 acres)\n$129.00\nPhotos\n$159.00\nHDR Photos\n$239.00"
  }'
```

**Response:**
```json
{
  "message": "Successfully imported 3 products",
  "total": 3,
  "saved": 3,
  "errors": 0,
  "products": [
    {
      "_id": "...",
      "name": "Exterior Photos Only (10-15, < 2 acres)",
      "price": 129,
      "action": "created"
    },
    {
      "_id": "...",
      "name": "Photos",
      "price": 159,
      "action": "created"
    }
  ],
  "errorsList": []
}
```

### Method 2: Bulk Add Products (Array Format)

**Endpoint:** `POST /api/products/bulk`  
**Auth:** Required (Bearer token)

```bash
curl -X POST http://localhost:3000/api/products/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "products": [
      {
        "name": "Exterior Photos Only (10-15, < 2 acres)",
        "price": 129.00,
        "description": "Exterior photos only",
        "stock": 0
      },
      {
        "name": "Photos",
        "price": 159.00,
        "description": "Standard photos",
        "stock": 0
      }
    ]
  }'
```

## Supported Text Format

The parser recognizes products in this format:

```
Product Name
$129.00
Another Product
$159.00
```

**Rules:**
- Product name on one line
- Price on the next line (format: `$XXX.XX`)
- Headers and section titles are automatically skipped
- Duplicate products are updated (price updated if product name matches)

## Example: Import Photography Services

```bash
# 1. Login as provider
curl -X POST http://localhost:3000/api/provider/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "shop@example.com",
    "password": "password123"
  }'
# Response contains token

# 2. Import products
curl -X POST http://localhost:3000/api/products/bulk-import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "Photography\nView Standard & HDR Comparison\n\nExterior Photos Only (10-15, < 2 acres)\n$129.00\nPhotos\n$159.00\nHDR Photos\n$239.00\nPhotos + Virtual Tour\n$219.00\nHDR Photos + Virtual Tour\n$319.00\nTwilight Exterior Photos Only\n$239.00\nTwilight Photos\n$329.00"
  }'
```

## Features

- ✅ Automatically parses product names and prices
- ✅ Skips headers and section titles
- ✅ Updates existing products (if name matches)
- ✅ Creates new products if they don't exist
- ✅ Returns detailed results with errors
- ✅ Handles various price formats ($129.00, $129, etc.)

## Notes

- Products are linked to the authenticated provider
- If a product with the same name exists, its price will be updated
- All products are saved with stock = 0 by default
- Empty or invalid products are skipped


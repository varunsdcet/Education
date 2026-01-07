# Provider API Documentation

Base URL: `http://localhost:3000`

All provider endpoints require authentication except registration and login.

---

## Authentication

### 1. Register Provider

```bash
curl -X POST http://localhost:3000/api/provider/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Photography Shop",
    "email": "photo@example.com",
    "password": "password123"
  }'
```

**With custom chatbotId:**
```bash
curl -X POST http://localhost:3000/api/provider/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Photography Shop",
    "email": "photo@example.com",
    "password": "password123",
    "chatbotId": "photographyshop"
  }'
```

**Response:**
```json
{
  "message": "Provider registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "provider": {
    "id": "65f1234567890abcdef12345",
    "name": "My Photography Shop",
    "email": "photo@example.com",
    "chatbotId": "photographyshop"
  }
}
```

**Note:** If `chatbotId` is not provided, system auto-generates a unique one based on provider name.

---

### 2. Login Provider

```bash
curl -X POST http://localhost:3000/api/provider/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "photo@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "provider": {
    "id": "65f1234567890abcdef12345",
    "name": "My Photography Shop",
    "email": "photo@example.com",
    "chatbotId": "photographyshop"
  }
}
```

**Save token:**
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Product Management

### 3. Add Single Product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Exterior Photos Only (10-15, < 2 acres)",
    "description": "Professional exterior photography",
    "price": 129.00,
    "stock": 10
  }'
```

**Response:**
```json
{
  "message": "Product added successfully",
  "product": {
    "_id": "65f1234567890abcdef12346",
    "name": "Exterior Photos Only (10-15, < 2 acres)",
    "description": "Professional exterior photography",
    "price": 129,
    "stock": 10,
    "providerId": "65f1234567890abcdef12345",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 4. Bulk Import Products from Text

```bash
curl -X POST http://localhost:3000/api/products/bulk-import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
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
    }
  ],
  "errorsList": []
}
```

---

### 5. Bulk Add Products (Array Format)

```bash
curl -X POST http://localhost:3000/api/products/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "products": [
      {
        "name": "Exterior Photos Only",
        "price": 129.00,
        "description": "Professional exterior photography",
        "stock": 10
      },
      {
        "name": "HDR Photos",
        "price": 239.00,
        "description": "High dynamic range photography",
        "stock": 5
      }
    ]
  }'
```

---

### 6. Get My Products

```bash
curl -X GET http://localhost:3000/api/provider/products \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "products": [
    {
      "_id": "...",
      "name": "Exterior Photos Only",
      "price": 129,
      "stock": 10,
      "description": "Professional exterior photography"
    }
  ]
}
```

---

## Order Management

### 7. Get All Orders

```bash
curl -X GET http://localhost:3000/api/provider/orders \
  -H "Authorization: Bearer $TOKEN"
```

**With filters:**
```bash
# Filter by status
curl -X GET "http://localhost:3000/api/provider/orders?status=confirmed" \
  -H "Authorization: Bearer $TOKEN"

# Pagination
curl -X GET "http://localhost:3000/api/provider/orders?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "orders": [
    {
      "_id": "...",
      "orderId": "ORD1234567890ABC",
      "productName": "Exterior Photos Only",
      "quantity": 2,
      "totalAmount": 258,
      "status": "confirmed",
      "paymentMethod": "COD",
      "address": "123 Main Street",
      "userId": {
        "name": "John Doe",
        "mobile": "1234567890"
      },
      "productId": {
        "name": "Exterior Photos Only",
        "price": 129
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10,
    "pages": 1
  }
}
```

---

### 8. Get New/Pending Orders

```bash
curl -X GET http://localhost:3000/api/provider/orders/new \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "orders": [...],
  "count": 5
}
```

---

### 9. Get Order Statistics

```bash
curl -X GET http://localhost:3000/api/provider/orders/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "totalOrders": 50,
  "totalRevenue": 15000,
  "statusCounts": {
    "pending": 2,
    "confirmed": 10,
    "payment_pending": 5,
    "paid": 8,
    "completed": 20,
    "cancelled": 5
  },
  "recentOrders": [
    {
      "orderId": "ORD1234567890ABC",
      "status": "confirmed",
      "totalAmount": 258
    }
  ]
}
```

---

### 10. Update Order Status

```bash
curl -X PATCH http://localhost:3000/api/provider/orders/ORD1234567890ABC \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "completed"
  }'
```

**Valid statuses:**
- `pending`
- `confirmed`
- `payment_pending`
- `paid`
- `completed`
- `cancelled`

**Response:**
```json
{
  "message": "Order status updated",
  "order": {
    "orderId": "ORD1234567890ABC",
    "status": "completed",
    "updatedAt": "2024-01-01T01:00:00.000Z"
  }
}
```

---

## Important Notes

- ✅ All products are automatically linked to your provider account
- ✅ All orders are automatically linked to your provider
- ✅ Users can only see products from your chatbot
- ✅ Orders placed through your chatbot are only visible to you
- ✅ Your `chatbotId` is unique and used by customers to access your chatbot
- ✅ Use `Authorization: Bearer $TOKEN` header for all authenticated endpoints

---

## Complete Workflow

1. **Register/Login** → Get authentication token
2. **Add Products** → Products linked to your account
3. **Customers use your chatbot** → `/chat/:yourChatbotId`
4. **View Orders** → All orders from your chatbot
5. **Update Status** → Manage order fulfillment


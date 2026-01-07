# Complete API Documentation with cURL Examples

Base URL: `http://localhost:3000`

---

## Table of Contents
1. [Provider Management](#provider-management)
2. [Product Management](#product-management)
3. [Chatbot Endpoints](#chatbot-endpoints)
4. [Order Management](#order-management)
5. [Payment Management](#payment-management)

---

## Provider Management

### 1. Register Provider

**Auto-generate chatbotId:**
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

**Save token for subsequent requests:**
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
    "text": "Exterior Photos Only (10-15, < 2 acres)\n$129.00\nPhotos\n$159.00\nHDR Photos\n$239.00\nPhotos + Virtual Tour\n$219.00"
  }'
```

**Response:**
```json
{
  "message": "Successfully imported 4 products",
  "total": 4,
  "saved": 4,
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

**Response:**
```json
{
  "message": "Successfully processed 2 products",
  "total": 2,
  "saved": 2,
  "errors": 0,
  "products": [...],
  "errorsList": []
}
```

---

### 6. Get Products by ChatbotId (Public)

```bash
curl -X GET http://localhost:3000/api/products/photographyshop
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

### 7. Get My Products (Provider Only)

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
      "stock": 10
    }
  ]
}
```

---

## Chatbot Endpoints

### 8. Chat with Bot (User Registration)

**First message:**
```bash
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hi",
    "sessionId": "user123"
  }'
```

**Response:**
```json
{
  "reply": "Welcome! You are a new user. What'\''s your name?"
}
```

**Provide name:**
```bash
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{
    "message": "John Doe",
    "sessionId": "user123"
  }'
```

**Response:**
```json
{
  "reply": "Nice to meet you, John Doe! What'\''s your mobile number?"
}
```

**Provide mobile:**
```bash
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{
    "message": "1234567890",
    "sessionId": "user123"
  }'
```

**Response:**
```json
{
  "reply": "Thanks John Doe! How can I help you today?"
}
```

---

### 9. Browse Products via Chatbot

```bash
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{
    "message": "show products",
    "sessionId": "user123"
  }'
```

**Response:**
```json
{
  "reply": "Here are our products:\nExterior Photos Only - ₹129\nPhotos - ₹159\nHDR Photos - ₹239"
}
```

---

### 10. Place Order via Chatbot

**Step 1: Start order**
```bash
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to place an order",
    "sessionId": "user123"
  }'
```

**Response:**
```json
{
  "reply": "Sure 👍 Here are our products:\nExterior Photos Only - ₹129\n...\n\nWhat product would you like to order?"
}
```

**Step 2: Select product**
```bash
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Exterior Photos Only",
    "sessionId": "user123"
  }'
```

**Response:**
```json
{
  "reply": "Great choice! Exterior Photos Only - ₹129\nHow many do you want?"
}
```

**Step 3: Provide quantity**
```bash
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{
    "message": "2",
    "sessionId": "user123"
  }'
```

**Response:**
```json
{
  "reply": "Total: ₹258\nPlease provide your delivery address:"
}
```

**Step 4: Provide address**
```bash
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{
    "message": "123 Main Street, City, State 12345",
    "sessionId": "user123"
  }'
```

**Response:**
```json
{
  "reply": "Address saved: 123 Main Street, City, State 12345\n\nPlease choose payment method: Online or COD"
}
```

**Step 5: Choose payment (COD)**
```bash
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{
    "message": "COD",
    "sessionId": "user123"
  }'
```

**Response:**
```json
{
  "reply": "✅ Order confirmed!\n\nOrder ID: ORD1234567890ABC\nName: John Doe\nMobile: 1234567890\nProduct: Exterior Photos Only\nQuantity: 2\nTotal: ₹258\nAddress: 123 Main Street, City, State 12345\nPayment: Cash on Delivery\n\nYour order will be delivered soon!"
}
```

**Step 5 Alternative: Choose payment (Online)**
```bash
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Online",
    "sessionId": "user123"
  }'
```

**Response:**
```json
{
  "reply": "✅ Order created!\nOrder ID: ORD1234567890ABC\nTotal: ₹258\n\n🔗 Payment Link: http://localhost:3000/api/payment/ORD1234567890ABC\n\nPlease complete the payment to confirm your order."
}
```

---

### 11. Check Order Status via Chatbot

```bash
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{
    "message": "order status ORD1234567890ABC",
    "sessionId": "user123"
  }'
```

**Response:**
```json
{
  "reply": "📦 Order Details:\n\nOrder ID: ORD1234567890ABC\nProduct: Exterior Photos Only\nQuantity: 2\nTotal: ₹258\nStatus: ✅ CONFIRMED\nPayment: COD\nDate: 1/1/2024, 12:00:00 PM"
}
```

**Or check all orders:**
```bash
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{
    "message": "my orders",
    "sessionId": "user123"
  }'
```

---

### 12. Cancel Order via Chatbot

```bash
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{
    "message": "cancel ORD1234567890ABC",
    "sessionId": "user123"
  }'
```

**Response:**
```json
{
  "reply": "✅ Order ORD1234567890ABC has been cancelled successfully."
}
```

---

## Order Management

### 13. Get Order by ID

```bash
curl -X GET http://localhost:3000/api/orders/ORD1234567890ABC
```

**Response:**
```json
{
  "order": {
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
    "providerId": {
      "name": "My Photography Shop",
      "chatbotId": "photographyshop"
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 14. Get User Order History

```bash
curl -X GET http://localhost:3000/api/orders/photographyshop/1234567890
```

**Response:**
```json
{
  "orders": [
    {
      "orderId": "ORD1234567890ABC",
      "productName": "Exterior Photos Only",
      "quantity": 2,
      "totalAmount": 258,
      "status": "confirmed"
    }
  ]
}
```

---

### 15. Get All Provider Orders

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
      "userId": {
        "name": "John Doe",
        "mobile": "1234567890"
      },
      "productId": {
        "name": "Exterior Photos Only",
        "price": 129
      }
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

### 16. Get New/Pending Orders (Provider)

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

### 17. Get Order Statistics (Provider)

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

### 18. Update Order Status (Provider)

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

### 19. Cancel Order (User)

```bash
curl -X POST http://localhost:3000/api/orders/ORD1234567890ABC/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "1234567890",
    "chatbotId": "photographyshop"
  }'
```

**Response:**
```json
{
  "message": "Order cancelled successfully",
  "order": {
    "orderId": "ORD1234567890ABC",
    "status": "cancelled"
  }
}
```

---

## Payment Management

### 20. Get Payment Link

```bash
curl -X GET http://localhost:3000/api/payment/ORD1234567890ABC
```

**Response:**
```json
{
  "orderId": "ORD1234567890ABC",
  "totalAmount": 258,
  "paymentLink": "http://localhost:3000/api/payment/ORD1234567890ABC",
  "status": "payment_pending"
}
```

---

### 21. Confirm Payment

```bash
curl -X POST http://localhost:3000/api/payment/ORD1234567890ABC \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "PAY1234567890",
    "status": "success"
  }'
```

**Response:**
```json
{
  "message": "Payment confirmed successfully",
  "order": {
    "orderId": "ORD1234567890ABC",
    "status": "paid",
    "totalAmount": 258
  }
}
```

---

## Complete Workflow Example

### 1. Register Provider
```bash
curl -X POST http://localhost:3000/api/provider/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Photography Services",
    "email": "photo@example.com",
    "password": "pass123"
  }'
# Save the token from response
export TOKEN="..."
```

### 2. Add Products
```bash
curl -X POST http://localhost:3000/api/products/bulk-import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "text": "Exterior Photos Only\n$129.00\nPhotos\n$159.00"
  }'
```

### 3. Customer Chats and Orders
```bash
# Register
curl -X POST http://localhost:3000/chat/photographyservices \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi", "sessionId": "user1"}'

# Browse
curl -X POST http://localhost:3000/chat/photographyservices \
  -H "Content-Type: application/json" \
  -d '{"message": "show products", "sessionId": "user1"}'

# Place order (follow the flow)
```

### 4. Provider Views Orders
```bash
curl -X GET http://localhost:3000/api/provider/orders \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Provider Updates Status
```bash
curl -X PATCH http://localhost:3000/api/provider/orders/ORD12345 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "completed"}'
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Name and price are required"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid token"
}
```

### 404 Not Found
```json
{
  "error": "Order not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to process request",
  "details": "Error message here"
}
```

---

## Notes

- Replace `$TOKEN` with actual JWT token from login/register
- Replace `photographyshop` with your actual `chatbotId`
- Replace `ORD1234567890ABC` with actual order IDs
- All prices are in the currency format (₹ for Indian Rupees, $ for USD)
- Session IDs should be consistent for the same user session


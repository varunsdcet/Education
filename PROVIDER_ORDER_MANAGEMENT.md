# Provider Order Management Guide

## ✅ Features Implemented

### 1. Unique ChatbotId Generation
- **Auto-generated**: If chatbotId is not provided during registration, system automatically generates a unique one
- **Based on provider name**: Uses provider name to create a meaningful chatbotId
- **Fallback**: If name-based ID exists, adds random suffix
- **Uniqueness guaranteed**: Database enforces unique constraint with index

### 2. Order Receipt & Notification
- **Automatic linking**: All orders are automatically linked to the provider via `providerId`
- **Console logging**: New orders are logged to console for immediate visibility
- **Real-time tracking**: Orders appear in provider dashboard immediately

### 3. Order Status Management
- **Provider can update status**: Providers can change order status via API
- **Status tracking**: Full order history with status changes
- **Multiple statuses**: pending, confirmed, payment_pending, paid, completed, cancelled

---

## API Endpoints

### Provider Registration (Auto chatbotId)

```bash
# Option 1: Let system generate chatbotId
POST /api/provider/register
{
  "name": "My Photography Shop",
  "email": "shop@example.com",
  "password": "password123"
  // chatbotId is auto-generated
}

# Option 2: Provide custom chatbotId
POST /api/provider/register
{
  "name": "My Photography Shop",
  "email": "shop@example.com",
  "password": "password123",
  "chatbotId": "photographyshop"  // Must be unique
}
```

**Response:**
```json
{
  "message": "Provider registered successfully",
  "token": "jwt_token",
  "provider": {
    "id": "...",
    "name": "My Photography Shop",
    "email": "shop@example.com",
    "chatbotId": "myphotographyshop"  // Auto-generated or provided
  }
}
```

### View All Orders (Provider)

```bash
GET /api/provider/orders
Authorization: Bearer <token>

# With filters
GET /api/provider/orders?status=confirmed
GET /api/provider/orders?status=payment_pending
GET /api/provider/orders?page=1&limit=20
```

**Response:**
```json
{
  "orders": [
    {
      "_id": "...",
      "orderId": "ORD12345",
      "productName": "Exterior Photos Only",
      "quantity": 1,
      "totalAmount": 129,
      "status": "confirmed",
      "paymentMethod": "COD",
      "address": "123 Main St",
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

### View New/Pending Orders

```bash
GET /api/provider/orders/new
Authorization: Bearer <token>
```

**Response:**
```json
{
  "orders": [...],
  "count": 5
}
```

### Order Statistics

```bash
GET /api/provider/orders/stats
Authorization: Bearer <token>
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
  "recentOrders": [...]
}
```

### Update Order Status

```bash
PATCH /api/provider/orders/:orderId
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed"
}
```

**Valid statuses:**
- `pending` - Order created
- `confirmed` - Order confirmed (COD)
- `payment_pending` - Waiting for payment
- `paid` - Payment received
- `completed` - Order delivered
- `cancelled` - Order cancelled

**Response:**
```json
{
  "message": "Order status updated",
  "order": {
    "orderId": "ORD12345",
    "status": "completed",
    ...
  }
}
```

---

## Order Flow

### When Customer Places Order:

1. **Customer orders via chatbot** → Order saved to MongoDB
2. **Order linked to provider** → `providerId` automatically set
3. **Console notification** → Logged for provider visibility
4. **Provider receives order** → Available via API immediately

### Provider Workflow:

1. **Login** → Get authentication token
2. **View new orders** → `GET /api/provider/orders/new`
3. **Check order details** → `GET /api/provider/orders`
4. **Update status** → `PATCH /api/provider/orders/:orderId`
5. **Track statistics** → `GET /api/provider/orders/stats`

---

## Example Workflow

### Step 1: Register Provider
```bash
curl -X POST http://localhost:3000/api/provider/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Photography Services",
    "email": "photo@example.com",
    "password": "pass123"
  }'
# chatbotId auto-generated: "photographyservices"
```

### Step 2: Customer Places Order
```bash
# Customer chats and places order
POST /chat/photographyservices
{
  "message": "I want to order",
  "sessionId": "user123"
}
# Order automatically saved and linked to provider
```

### Step 3: Provider Views Orders
```bash
curl -X GET http://localhost:3000/api/provider/orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 4: Provider Updates Status
```bash
curl -X PATCH http://localhost:3000/api/provider/orders/ORD12345 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

---

## Console Logging

When an order is placed, you'll see in the console:

```
📦 NEW ORDER RECEIVED - Provider: Photography Services (photographyservices)
   Order ID: ORD12345, Status: confirmed, Amount: ₹129
   Customer: John Doe (1234567890), Product: Exterior Photos Only x1
```

---

## Notes

- ✅ **chatbotId is always unique** - Database enforces uniqueness
- ✅ **Orders automatically linked** - No manual linking needed
- ✅ **Real-time visibility** - Orders appear immediately
- ✅ **Full order history** - All orders tracked with status
- ✅ **Provider control** - Providers can update any order status
- ✅ **Statistics available** - Revenue, counts, and analytics


# User API Documentation

Base URL: `http://localhost:3000`

User APIs are public and don't require authentication. Users interact with specific chatbots identified by `chatbotId`.

---

## Public Endpoints

### 1. List All Available Chatbots

```bash
curl -X GET http://localhost:3000/api/chatbots
```

**Response:**
```json
{
  "chatbots": [
    {
      "chatbotId": "photographyshop",
      "name": "My Photography Shop",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "chatbotId": "electronicsstore",
      "name": "Electronics Store",
      "createdAt": "2024-01-02T00:00:00.000Z"
    }
  ],
  "count": 2
}
```

**Use this to:**
- Show users available chatbots
- Let users choose which chatbot to interact with
- Display chatbot names and IDs

---

### 2. Get Products by ChatbotId

```bash
curl -X GET http://localhost:3000/api/products/photographyshop
```

**Response:**
```json
{
  "chatbotId": "photographyshop",
  "providerName": "My Photography Shop",
  "products": [
    {
      "_id": "...",
      "name": "Exterior Photos Only (10-15, < 2 acres)",
      "price": 129,
      "stock": 10,
      "description": "Professional exterior photography"
    },
    {
      "_id": "...",
      "name": "HDR Photos",
      "price": 239,
      "stock": 5,
      "description": "High dynamic range photography"
    }
  ]
}
```

**Important:** This only returns products from the specified chatbot.

---

## Chatbot Interaction

### 3. Chat with Bot (User Registration)

Users must register with a specific chatbot. Each chatbot has its own user base.

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

**Important:** 
- User is registered with `chatbotId: "photographyshop"`
- User can only see products from this chatbot
- User can only place orders from this chatbot

---

### 4. Browse Products via Chatbot

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

**Note:** Only shows products from `photographyshop` chatbot.

---

### 5. Place Order via Chatbot

**Step 1: Start order**
```bash
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to order",
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

**Step 3: Provide quantity**
```bash
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{
    "message": "2",
    "sessionId": "user123"
  }'
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

**Important:**
- Order is automatically linked to `photographyshop` provider
- Order is linked to user registered with this chatbot
- Provider receives notification of new order

---

### 6. Check Order Status via Chatbot

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

### 7. Cancel Order via Chatbot

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

## Order Management APIs

### 8. Get Order by ID

```bash
curl -X GET http://localhost:3000/api/orders/ORD1234567890ABC
```

**Response:**
```json
{
  "order": {
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

### 9. Get User Order History

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

**Important:** 
- Must specify `chatbotId` and `mobile`
- Only returns orders from that specific chatbot
- Same mobile number can have different orders from different chatbots

---

### 10. Cancel Order

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

### 11. Get Payment Link

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

### 12. Confirm Payment

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

## Important Notes

### Chatbot Isolation
- ✅ Each chatbot has its own products
- ✅ Users register with a specific chatbot
- ✅ Users can only see products from their chatbot
- ✅ Orders are linked to the specific chatbot/provider
- ✅ Same mobile number can register with multiple chatbots (separate accounts)

### User Registration
- ✅ User registration is tied to `chatbotId`
- ✅ User can only interact with products from that chatbot
- ✅ User can only place orders from that chatbot
- ✅ Order history is filtered by chatbot

### Order Flow
1. User chooses chatbot (from `/api/chatbots`)
2. User registers with that chatbot (`/chat/:chatbotId`)
3. User browses products (only from that chatbot)
4. User places order (automatically linked to that chatbot's provider)
5. Provider receives order notification
6. Provider can update order status

---

## Complete User Flow Example

```bash
# 1. List available chatbots
curl -X GET http://localhost:3000/api/chatbots

# 2. User chooses "photographyshop" and starts chatting
curl -X POST http://localhost:3000/chat/photographyshop \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi", "sessionId": "user123"}'

# 3. Register (name, mobile)
# 4. Browse products (only from photographyshop)
# 5. Place order (automatically linked to photographyshop provider)
# 6. Check order status
# 7. Provider receives order and can update status
```


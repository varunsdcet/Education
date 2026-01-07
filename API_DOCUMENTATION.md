# Ecommerce Chatbot API Documentation

## Complete Purchase Flow via Chatbot

### 1. User Registration Flow
```
POST /chat/:chatbotId
Body: { "message": "Hi", "sessionId": "user123" }

Flow:
1. First message → Asks for name
2. User provides name → Asks for mobile
3. User provides mobile → User saved to DB, ready to shop
```

### 2. Browse Products
```
POST /chat/:chatbotId
Body: { "message": "show products", "sessionId": "user123" }

Response: List of all products with prices
```

### 3. Place Order Flow
```
POST /chat/:chatbotId
Body: { "message": "I want to order", "sessionId": "user123" }

Flow:
1. User says "place order" → Shows products
2. User selects product → Asks for quantity
3. User provides quantity → Asks for delivery address
4. User provides address → Asks for payment method (Online/COD)
5. User chooses payment:
   - COD → Order confirmed immediately, saved to DB
   - Online → Order created with payment link
```

### 4. Order Status Check
```
POST /chat/:chatbotId
Body: { "message": "order status ORD12345", "sessionId": "user123" }

OR

Body: { "message": "my orders", "sessionId": "user123" }

Response: Order details or list of recent orders
```

### 5. Cancel Order
```
POST /chat/:chatbotId
Body: { "message": "cancel ORD12345", "sessionId": "user123" }

Response: Order cancellation confirmation
```

---

## REST API Endpoints

### Provider Management

#### Register Provider
```bash
POST /api/provider/register
Content-Type: application/json

{
  "name": "My Shop",
  "email": "shop@example.com",
  "password": "password123",
  "chatbotId": "shopchatbot"
}

Response:
{
  "message": "Provider registered successfully",
  "token": "jwt_token_here",
  "provider": { ... }
}
```

#### Login Provider
```bash
POST /api/provider/login
Content-Type: application/json

{
  "email": "shop@example.com",
  "password": "password123"
}

Response:
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "provider": { ... }
}
```

### Product Management

#### Add Product (Requires Auth)
```bash
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "iPhone 15",
  "description": "Latest iPhone",
  "price": 79999,
  "stock": 10
}
```

#### Get Products by Chatbot (Public)
```bash
GET /api/products/:chatbotId

Response:
{
  "products": [
    {
      "_id": "...",
      "name": "iPhone 15",
      "price": 79999,
      "stock": 10
    }
  ]
}
```

#### Get My Products (Requires Auth)
```bash
GET /api/provider/products
Authorization: Bearer <token>
```

### Order Management

#### Get Order by ID
```bash
GET /api/orders/:orderId

Response:
{
  "order": {
    "orderId": "ORD12345",
    "productName": "iPhone 15",
    "quantity": 2,
    "totalAmount": 159998,
    "status": "confirmed",
    ...
  }
}
```

#### Get User Order History
```bash
GET /api/orders/:chatbotId/:mobile

Response:
{
  "orders": [ ... ]
}
```

#### Get Provider Orders (Requires Auth)
```bash
GET /api/provider/orders
Authorization: Bearer <token>
Query params: ?status=confirmed (optional)

Response:
{
  "orders": [ ... ]
}
```

#### Update Order Status (Provider Only)
```bash
PATCH /api/provider/orders/:orderId
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed"
}
```

#### Cancel Order
```bash
POST /api/orders/:orderId/cancel
Content-Type: application/json

{
  "mobile": "1234567890",
  "chatbotId": "shopchatbot"
}
```

### Payment Management

#### Get Payment Link
```bash
GET /api/payment/:orderId

Response:
{
  "orderId": "ORD12345",
  "totalAmount": 159998,
  "paymentLink": "https://education-c0c9.onrender.com/api/payment/ORD12345",
  "status": "payment_pending"
}
```

#### Confirm Payment
```bash
POST /api/payment/:orderId
Content-Type: application/json

{
  "paymentId": "PAY12345",
  "status": "success"
}

Response:
{
  "message": "Payment confirmed successfully",
  "order": {
    "orderId": "ORD12345",
    "status": "paid",
    "totalAmount": 159998
  }
}
```

---

## Complete Purchase Flow Example

### Step 1: User Registration
```bash
curl -X POST https://education-c0c9.onrender.com/chat/shopchatbot \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi", "sessionId": "user123"}'
# Response: "Welcome! You are a new user. What's your name?"

curl -X POST https://education-c0c9.onrender.com/chat/shopchatbot \
  -H "Content-Type: application/json" \
  -d '{"message": "John", "sessionId": "user123"}'
# Response: "Nice to meet you, John! What's your mobile number?"

curl -X POST https://education-c0c9.onrender.com/chat/shopchatbot \
  -H "Content-Type: application/json" \
  -d '{"message": "1234567890", "sessionId": "user123"}'
# Response: "Thanks John! How can I help you today?"
```

### Step 2: Browse Products
```bash
curl -X POST https://education-c0c9.onrender.com/chat/shopchatbot \
  -H "Content-Type: application/json" \
  -d '{"message": "show products", "sessionId": "user123"}'
# Response: List of products
```

### Step 3: Place Order
```bash
curl -X POST https://education-c0c9.onrender.com/chat/shopchatbot \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to order", "sessionId": "user123"}'
# Response: Shows products and asks which product

curl -X POST https://education-c0c9.onrender.com/chat/shopchatbot \
  -H "Content-Type: application/json" \
  -d '{"message": "iPhone 15", "sessionId": "user123"}'
# Response: "Great choice! iPhone 15 - ₹79999. How many do you want?"

curl -X POST https://education-c0c9.onrender.com/chat/shopchatbot \
  -H "Content-Type: application/json" \
  -d '{"message": "2", "sessionId": "user123"}'
# Response: "Total: ₹159998. Please provide your delivery address:"

curl -X POST https://education-c0c9.onrender.com/chat/shopchatbot \
  -H "Content-Type: application/json" \
  -d '{"message": "123 Main St, City", "sessionId": "user123"}'
# Response: "Address saved. Please choose payment method: Online or COD"

curl -X POST https://education-c0c9.onrender.com/chat/shopchatbot \
  -H "Content-Type: application/json" \
  -d '{"message": "COD", "sessionId": "user123"}'
# Response: "✅ Order confirmed! Order ID: ORD12345..."
```

### Step 4: Check Order Status
```bash
curl -X POST https://education-c0c9.onrender.com/chat/shopchatbot \
  -H "Content-Type: application/json" \
  -d '{"message": "order status ORD12345", "sessionId": "user123"}'
# Response: Full order details
```

---

## Order Statuses

- `pending` - Order created but not confirmed
- `confirmed` - Order confirmed (COD)
- `payment_pending` - Waiting for online payment
- `paid` - Payment received
- `completed` - Order delivered
- `cancelled` - Order cancelled

---

## Notes

- All orders are saved to MongoDB with full history
- Each provider has their own chatbot with unique `chatbotId`
- Users are tracked per chatbot
- Orders include address, payment method, and full details
- Payment links are generated for online payments
- Order status can be updated by providers


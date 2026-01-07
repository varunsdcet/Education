# Production API Reference

**Base URL:** `https://education-c0c9.onrender.com`

---

## Quick API Endpoints

### Provider APIs

#### Register Provider
```bash
POST https://education-c0c9.onrender.com/api/provider/register
```

#### Login Provider
```bash
POST https://education-c0c9.onrender.com/api/provider/login
```

#### Add Product
```bash
POST https://education-c0c9.onrender.com/api/products
Authorization: Bearer <token>
```

#### Bulk Import Products
```bash
POST https://education-c0c9.onrender.com/api/products/bulk-import
Authorization: Bearer <token>
```

#### Get My Products
```bash
GET https://education-c0c9.onrender.com/api/provider/products
Authorization: Bearer <token>
```

#### Get All Orders
```bash
GET https://education-c0c9.onrender.com/api/provider/orders
Authorization: Bearer <token>
```

#### Update Order Status
```bash
PATCH https://education-c0c9.onrender.com/api/provider/orders/:orderId
Authorization: Bearer <token>
```

---

### User/Public APIs

#### List All Chatbots
```bash
GET https://education-c0c9.onrender.com/api/chatbots
```

#### Get Products by Chatbot
```bash
GET https://education-c0c9.onrender.com/api/products/:chatbotId
```

#### Chat with Bot
```bash
POST https://education-c0c9.onrender.com/chat/:chatbotId
```

#### Get Order by ID
```bash
GET https://education-c0c9.onrender.com/api/orders/:orderId
```

#### Get User Order History
```bash
GET https://education-c0c9.onrender.com/api/orders/:chatbotId/:mobile
```

#### Cancel Order
```bash
POST https://education-c0c9.onrender.com/api/orders/:orderId/cancel
```

#### Get Payment Link
```bash
GET https://education-c0c9.onrender.com/api/payment/:orderId
```

#### Confirm Payment
```bash
POST https://education-c0c9.onrender.com/api/payment/:orderId
```

---

## Example cURL Commands

### 1. Register Provider
```bash
curl -X POST https://education-c0c9.onrender.com/api/provider/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Shop",
    "email": "shop@example.com",
    "password": "password123"
  }'
```

### 2. List Available Chatbots
```bash
curl -X GET https://education-c0c9.onrender.com/api/chatbots
```

### 3. Chat with Bot
```bash
curl -X POST https://education-c0c9.onrender.com/chat/YOUR_CHATBOT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hi",
    "sessionId": "user123"
  }'
```

### 4. Get Products
```bash
curl -X GET https://education-c0c9.onrender.com/api/products/YOUR_CHATBOT_ID
```

---

## Testing the API

You can test all endpoints using:
- **cURL** (command line)
- **Postman** (GUI)
- **Browser** (for GET requests)
- **JavaScript fetch** (frontend)

---

## Full Documentation

- **Provider APIs:** [PROVIDER_API_DOCUMENTATION.md](./PROVIDER_API_DOCUMENTATION.md)
- **User APIs:** [USER_API_DOCUMENTATION.md](./USER_API_DOCUMENTATION.md)
- **Complete Docs:** [COMPLETE_API_DOCUMENTATION.md](./COMPLETE_API_DOCUMENTATION.md)


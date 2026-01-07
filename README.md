# Ecommerce Chatbot System

A multi-tenant ecommerce chatbot system where providers can create their own chatbots and customers can place orders via chat.

## Features

- ✅ Multi-tenant architecture (multiple providers, each with their own chatbot)
- ✅ Provider registration and authentication
- ✅ Product management (single and bulk import)
- ✅ User registration via chatbot
- ✅ Order placement via chatbot
- ✅ Order management for providers
- ✅ Payment integration (COD and Online)
- ✅ Order history and tracking
- ✅ Intent detection using Azure OpenAI

## Tech Stack

- Node.js + Express
- MongoDB (Mongoose)
- Azure OpenAI (GPT-4)
- JWT Authentication
- bcrypt for password hashing

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Azure OpenAI Configuration
AZURE_ENDPOINT=https://your-azure-endpoint.openai.azure.com
AZURE_API_KEY=your-azure-api-key-here
AZURE_DEPLOYMENT=gpt-4o-2
AZURE_API_VERSION=2024-02-01

# MongoDB Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# JWT Secret
JWT_SECRET=your-secret-key-here

# Base URL (optional)
BASE_URL=http://localhost:3000
```

### 3. Start Server

```bash
npm start
```

Server will run on `http://localhost:3000`

## API Documentation

- **Provider APIs:** See [PROVIDER_API_DOCUMENTATION.md](./PROVIDER_API_DOCUMENTATION.md)
- **User APIs:** See [USER_API_DOCUMENTATION.md](./USER_API_DOCUMENTATION.md)
- **Complete API Docs:** See [COMPLETE_API_DOCUMENTATION.md](./COMPLETE_API_DOCUMENTATION.md)

## Quick Start

### 1. Register a Provider

```bash
curl -X POST http://localhost:3000/api/provider/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Shop",
    "email": "shop@example.com",
    "password": "password123"
  }'
```

### 2. Add Products

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "price": 100,
    "description": "Product description"
  }'
```

### 3. User Chats with Bot

```bash
curl -X POST http://localhost:3000/chat/YOUR_CHATBOT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hi",
    "sessionId": "user123"
  }'
```

## Project Structure

```
ecommerce-chatbot/
├── models/           # MongoDB models
│   ├── Provider.js
│   ├── Product.js
│   ├── User.js
│   └── Order.js
├── routes/           # API routes (if separated)
├── utils/            # Utility functions
│   └── productParser.js
├── index.js          # Main server file
├── intentDetector.js # AI intent detection
├── orderState.js     # In-memory order state
├── db.js             # MongoDB connection
└── package.json
```

## Key Features

### Chatbot Isolation
- Each provider has a unique `chatbotId`
- Users register with a specific chatbot
- Products and orders are isolated per chatbot

### Order Flow
1. User registers (name, mobile)
2. User browses products
3. User places order (product, quantity, address, payment)
4. Order saved to MongoDB
5. Provider receives order notification
6. Provider can update order status

## License

ISC

## Repository

[GitHub Repository](https://github.com/varunsdcet/Education)


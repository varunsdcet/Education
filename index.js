import express from "express";
import "dotenv/config";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "./db.js"; // Initialize MongoDB connection
import { detectIntent } from "./intentDetector.js";
import { getOrder } from "./orderState.js";
import Provider from "./models/Provider.js";
import Product from "./models/Product.js";
import User from "./models/User.js";
import Order from "./models/Order.js";
import { parseProductsFromText } from "./utils/productParser.js";

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// Azure OpenAI Configuration
const AZURE_ENDPOINT = process.env.AZURE_ENDPOINT;
const AZURE_API_KEY = process.env.AZURE_API_KEY;
const AZURE_DEPLOYMENT = process.env.AZURE_DEPLOYMENT || "gpt-4o-2";
const AZURE_API_VERSION = process.env.AZURE_API_VERSION || "2024-02-01";

if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
  console.error("Error: AZURE_ENDPOINT and AZURE_API_KEY must be set in environment variables");
}

// Middleware to verify JWT token
const authenticateProvider = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const provider = await Provider.findById(decoded.id);
    if (!provider) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.provider = provider;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// ========== PROVIDER ENDPOINTS ==========

// Generate unique chatbotId
async function generateUniqueChatbotId(baseName = null) {
  let chatbotId;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    if (baseName) {
      // Try base name first, then add random suffix if needed
      const suffix = attempts > 0 ? `-${Math.random().toString(36).substr(2, 4)}` : '';
      chatbotId = `${baseName.toLowerCase().replace(/[^a-z0-9]/g, '')}${suffix}`;
    } else {
      // Generate random chatbotId
      chatbotId = `bot-${Math.random().toString(36).substr(2, 8)}`;
    }

    const existing = await Provider.findOne({ chatbotId });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    // Fallback: use timestamp + random
    chatbotId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  return chatbotId;
}

// Provider Registration
app.post("/api/provider/register", async (req, res) => {
  try {
    const { name, email, password, chatbotId: requestedChatbotId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    // Check if email already exists
    const existingEmail = await Provider.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Generate or validate chatbotId
    let finalChatbotId;
    if (requestedChatbotId) {
      // Check if requested chatbotId is available
      const existingChatbotId = await Provider.findOne({ chatbotId: requestedChatbotId });
      if (existingChatbotId) {
        return res.status(400).json({ error: "Chatbot ID already taken. Please choose another." });
      }
      finalChatbotId = requestedChatbotId.toLowerCase().replace(/[^a-z0-9-]/g, '');
    } else {
      // Auto-generate unique chatbotId based on provider name
      finalChatbotId = await generateUniqueChatbotId(name);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create provider
    const provider = new Provider({
      name,
      email,
      password: hashedPassword,
      chatbotId: finalChatbotId,
    });

    await provider.save();

    // Generate JWT token
    const token = jwt.sign({ id: provider._id }, JWT_SECRET);

    res.status(201).json({
      message: "Provider registered successfully",
      token,
      provider: {
        id: provider._id,
        name: provider.name,
        email: provider.email,
        chatbotId: provider.chatbotId,
      },
    });
  } catch (error) {
    console.error("Provider registration error:", error);
    res.status(500).json({ error: "Failed to register provider", details: error.message });
  }
});

// Provider Login
app.post("/api/provider/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const provider = await Provider.findOne({ email });
    if (!provider) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, provider.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: provider._id }, JWT_SECRET);

    res.json({
      message: "Login successful",
      token,
      provider: {
        id: provider._id,
        name: provider.name,
        email: provider.email,
        chatbotId: provider.chatbotId,
      },
    });
  } catch (error) {
    console.error("Provider login error:", error);
    res.status(500).json({ error: "Failed to login", details: error.message });
  }
});

// ========== PRODUCT ENDPOINTS ==========

// Add Product (Provider only)
app.post("/api/products", authenticateProvider, async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    const product = new Product({
      providerId: req.provider._id,
      name,
      description,
      price: Number(price),
      stock: stock ? Number(stock) : 0,
    });

    await product.save();

    res.status(201).json({
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    console.error("Add product error:", error);
    res.status(500).json({ error: "Failed to add product", details: error.message });
  }
});

// ========== PUBLIC ENDPOINTS ==========

// List all available chatbots
app.get("/api/chatbots", async (req, res) => {
  try {
    const providers = await Provider.find({}, "name chatbotId createdAt").sort({ createdAt: -1 });
    
    const chatbots = providers.map(p => ({
      chatbotId: p.chatbotId,
      name: p.name,
      createdAt: p.createdAt,
    }));

    res.json({
      chatbots,
      count: chatbots.length,
    });
  } catch (error) {
    console.error("Get chatbots error:", error);
    res.status(500).json({ error: "Failed to get chatbots", details: error.message });
  }
});

// Get Products by Provider (Public - for chatbot)
app.get("/api/products/:chatbotId", async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const provider = await Provider.findOne({ chatbotId });

    if (!provider) {
      return res.status(404).json({ error: "Chatbot not found" });
    }

    const products = await Product.find({ providerId: provider._id });

    res.json({ 
      chatbotId,
      providerName: provider.name,
      products 
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ error: "Failed to get products", details: error.message });
  }
});

// Get My Products (Provider only)
app.get("/api/provider/products", authenticateProvider, async (req, res) => {
  try {
    const products = await Product.find({ providerId: req.provider._id });
    res.json({ products });
  } catch (error) {
    console.error("Get my products error:", error);
    res.status(500).json({ error: "Failed to get products", details: error.message });
  }
});

// Bulk Import Products from Text (Provider only)
app.post("/api/products/bulk-import", authenticateProvider, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    // Parse products from text
    const parsedProducts = parseProductsFromText(text);

    if (parsedProducts.length === 0) {
      return res.status(400).json({ 
        error: "No products found in text. Please ensure format is: Product Name\n$Price" 
      });
    }

    // Save products to database
    const savedProducts = [];
    const errors = [];

    for (const productData of parsedProducts) {
      try {
        // Check if product already exists
        const existingProduct = await Product.findOne({
          providerId: req.provider._id,
          name: productData.name,
        });

        if (existingProduct) {
          // Update existing product price
          existingProduct.price = productData.price;
          if (productData.description) {
            existingProduct.description = productData.description;
          }
          await existingProduct.save();
          savedProducts.push({ ...existingProduct.toObject(), action: "updated" });
        } else {
          // Create new product
          const product = new Product({
            providerId: req.provider._id,
            name: productData.name,
            description: productData.description || "",
            price: productData.price,
            stock: 0,
          });
          await product.save();
          savedProducts.push({ ...product.toObject(), action: "created" });
        }
      } catch (err) {
        errors.push({
          product: productData.name,
          error: err.message,
        });
      }
    }

    res.status(201).json({
      message: `Successfully imported ${savedProducts.length} products`,
      total: parsedProducts.length,
      saved: savedProducts.length,
      errors: errors.length,
      products: savedProducts,
      errorsList: errors,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    res.status(500).json({ error: "Failed to import products", details: error.message });
  }
});

// Bulk Add Products (Array format - Provider only)
app.post("/api/products/bulk", authenticateProvider, async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Products array is required" });
    }

    const savedProducts = [];
    const errors = [];

    for (const productData of products) {
      try {
        if (!productData.name || productData.price === undefined) {
          errors.push({
            product: productData.name || "Unknown",
            error: "Name and price are required",
          });
          continue;
        }

        // Check if product already exists
        const existingProduct = await Product.findOne({
          providerId: req.provider._id,
          name: productData.name,
        });

        if (existingProduct) {
          existingProduct.price = Number(productData.price);
          if (productData.description) {
            existingProduct.description = productData.description;
          }
          if (productData.stock !== undefined) {
            existingProduct.stock = Number(productData.stock);
          }
          await existingProduct.save();
          savedProducts.push({ ...existingProduct.toObject(), action: "updated" });
        } else {
          const product = new Product({
            providerId: req.provider._id,
            name: productData.name,
            description: productData.description || "",
            price: Number(productData.price),
            stock: productData.stock ? Number(productData.stock) : 0,
          });
          await product.save();
          savedProducts.push({ ...product.toObject(), action: "created" });
        }
      } catch (err) {
        errors.push({
          product: productData.name || "Unknown",
          error: err.message,
        });
      }
    }

    res.status(201).json({
      message: `Successfully processed ${savedProducts.length} products`,
      total: products.length,
      saved: savedProducts.length,
      errors: errors.length,
      products: savedProducts,
      errorsList: errors,
    });
  } catch (error) {
    console.error("Bulk add error:", error);
    res.status(500).json({ error: "Failed to add products", details: error.message });
  }
});

// ========== CHAT ENDPOINT (Provider-specific) ==========

app.post("/chat/:chatbotId", async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const { message, sessionId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required and must be a string" });
    }

    // Verify provider exists
    const provider = await Provider.findOne({ chatbotId });
    if (!provider) {
      return res.status(404).json({ error: "Chatbot not found" });
    }

    // Get or create user
    const uniqueSessionId = `${chatbotId}_${sessionId || "default"}`;
    const order = getOrder(uniqueSessionId);

    // Get products for this provider
    const products = await Product.find({ providerId: provider._id });

    // USER REGISTRATION FLOW
    if (order.step === "ask_name") {
      order.name = message;
      order.step = "ask_mobile";
      return res.json({
        reply: `Nice to meet you, ${order.name}! What's your mobile number?`,
      });
    }

    if (order.step === "ask_mobile") {
      order.mobile = message;
      order.isNewUser = false;
      order.step = null;

      // Save user to MongoDB
      try {
        let user = await User.findOne({ mobile: message, chatbotId });
        if (!user) {
          user = new User({
            name: order.name,
            mobile: message,
            chatbotId,
          });
          await user.save();
        }
        order.userId = user._id.toString();
      } catch (err) {
        console.error("Error saving user:", err);
      }

      return res.json({
        reply: `Thanks ${order.name}! How can I help you today?`,
      });
    }

    // Check if new user
    if (order.isNewUser && !order.name && !order.step) {
      order.step = "ask_name";
      order.chatbotId = chatbotId;
      return res.json({
        reply: "Welcome! You are a new user. What's your name?",
      });
    }

    // Hardcoded COD check
    if (message.toLowerCase().includes("cod") && !order.step) {
      return res.json({
        reply: "Yes, Cash on Delivery is available.",
      });
    }

    // ORDER FLOW
    const { intent, entities } = await detectIntent(message);

    console.log("INTENT:", intent, entities);

    // Browse products
    if (intent === "browse_products") {
      if (products.length === 0) {
        return res.json({ reply: "No products available at the moment." });
      }
      const productList = products.map((p) => `${p.name} - ₹${p.price}`).join("\n");
      return res.json({ reply: `Here are our products:\n${productList}` });
    }

    // Start order
    if (intent === "place_order" && !order.step) {
      if (products.length === 0) {
        return res.json({ reply: "No products available at the moment." });
      }
      const productList = products.map((p) => `${p.name} - ₹${p.price}`).join("\n");
      order.step = "ask_product";
      order.providerId = provider._id.toString();
      return res.json({
        reply: `Sure 👍 Here are our products:\n${productList}\n\nWhat product would you like to order?`,
      });
    }

    // Ask product
    if (order.step === "ask_product") {
      // Find product by name
      const selectedProduct = products.find(
        (p) => p.name.toLowerCase().includes(message.toLowerCase()) || message.toLowerCase().includes(p.name.toLowerCase())
      );

      if (!selectedProduct) {
        return res.json({
          reply: "Product not found. Please choose from the available products.",
        });
      }

      order.productId = selectedProduct._id.toString();
      order.productName = selectedProduct.name;
      order.productPrice = selectedProduct.price;
      order.step = "ask_quantity";
      return res.json({
        reply: `Great choice! ${selectedProduct.name} - ₹${selectedProduct.price}\nHow many do you want?`,
      });
    }

    // Ask quantity
    if (order.step === "ask_quantity") {
      const quantity = parseInt(message);
      if (isNaN(quantity) || quantity <= 0) {
        return res.json({
          reply: "Please enter a valid quantity (number greater than 0).",
        });
      }
      order.quantity = quantity;
      order.step = "ask_address";
      const total = order.productPrice * quantity;
      return res.json({
        reply: `Total: ₹${total}\nPlease provide your delivery address:`,
      });
    }

    // Ask address
    if (order.step === "ask_address") {
      order.address = message;
      order.step = "ask_payment";
      return res.json({
        reply: `Address saved: ${message}\n\nPlease choose payment method: Online or COD`,
      });
    }

    // Ask payment
    if (order.step === "ask_payment") {
      order.paymentMethod = message.toLowerCase();

      if (order.paymentMethod.includes("online")) {
        // Create order with payment_pending status
        try {
          const totalAmount = order.productPrice * order.quantity;
          const orderId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
          const paymentLink = `${process.env.BASE_URL || "http://localhost:3000"}/api/payment/${orderId}`;

          const newOrder = new Order({
            orderId,
            userId: order.userId,
            providerId: order.providerId,
            productId: order.productId,
            productName: order.productName,
            quantity: order.quantity,
            price: order.productPrice,
            totalAmount,
            paymentMethod: "Online",
            address: order.address,
            paymentLink,
            status: "payment_pending",
          });

          await newOrder.save();
          order.orderId = orderId;

          // Log order creation for provider
          console.log(`📦 NEW ORDER RECEIVED - Provider: ${provider.name} (${provider.chatbotId})`);
          console.log(`   Order ID: ${orderId}, Status: payment_pending, Amount: ₹${totalAmount}`);

          order.step = "payment_pending";
          return res.json({
            reply: `✅ Order created!\nOrder ID: ${orderId}\nTotal: ₹${totalAmount}\n\n🔗 Payment Link: ${paymentLink}\n\nPlease complete the payment to confirm your order.`,
          });
        } catch (err) {
          console.error("Error saving order:", err);
          return res.json({
            reply: "Sorry, there was an error creating your order. Please try again.",
          });
        }
      }

      if (order.paymentMethod.includes("cod")) {
        // Save COD order to MongoDB
        try {
          const totalAmount = order.productPrice * order.quantity;
          const orderId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

          const newOrder = new Order({
            orderId,
            userId: order.userId,
            providerId: order.providerId,
            productId: order.productId,
            productName: order.productName,
            quantity: order.quantity,
            price: order.productPrice,
            totalAmount,
            paymentMethod: "COD",
            address: order.address,
            status: "confirmed",
          });

          await newOrder.save();
          order.orderId = orderId;
          order.step = "confirmed";

          // Log order creation for provider
          console.log(`📦 NEW ORDER RECEIVED - Provider: ${provider.name} (${provider.chatbotId})`);
          console.log(`   Order ID: ${orderId}, Status: confirmed, Amount: ₹${totalAmount}`);
          console.log(`   Customer: ${order.name} (${order.mobile}), Product: ${order.productName} x${order.quantity}`);

          // Reset order state
          setTimeout(() => {
            order.step = null;
            order.productId = null;
            order.productName = null;
            order.productPrice = null;
            order.quantity = null;
            order.paymentMethod = null;
            order.address = null;
          }, 1000);

          return res.json({
            reply: `✅ Order confirmed!\n\nOrder ID: ${orderId}\nName: ${order.name}\nMobile: ${order.mobile}\nProduct: ${order.productName}\nQuantity: ${order.quantity}\nTotal: ₹${totalAmount}\nAddress: ${order.address}\nPayment: Cash on Delivery\n\nYour order will be delivered soon!`,
          });
        } catch (err) {
          console.error("Error saving order:", err);
          return res.json({
            reply: "Sorry, there was an error saving your order. Please try again.",
          });
        }
      }
    }

    // Order status check
    if (intent === "order_status") {
      // Check if message contains order ID
      const orderIdMatch = message.match(/ORD[A-Z0-9]+/i);
      if (orderIdMatch) {
        const orderId = orderIdMatch[0].toUpperCase();
        try {
          const foundOrder = await Order.findOne({ orderId, userId: order.userId })
            .populate("productId", "name price");

          if (!foundOrder) {
            return res.json({
              reply: `Order ${orderId} not found. Please check your order ID.`,
            });
          }

          const statusEmoji = {
            pending: "⏳",
            confirmed: "✅",
            payment_pending: "💳",
            paid: "✅",
            completed: "🎉",
            cancelled: "❌",
          };

          return res.json({
            reply: `📦 Order Details:\n\nOrder ID: ${foundOrder.orderId}\nProduct: ${foundOrder.productName}\nQuantity: ${foundOrder.quantity}\nTotal: ₹${foundOrder.totalAmount}\nStatus: ${statusEmoji[foundOrder.status] || ""} ${foundOrder.status.toUpperCase()}\nPayment: ${foundOrder.paymentMethod}\nDate: ${new Date(foundOrder.createdAt).toLocaleString()}`,
          });
        } catch (err) {
          console.error("Error fetching order:", err);
          return res.json({
            reply: "Sorry, there was an error fetching your order details.",
          });
        }
      } else {
        // Show recent orders
        try {
          const recentOrders = await Order.find({ userId: order.userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("productId", "name");

          if (recentOrders.length === 0) {
            return res.json({
              reply: "You don't have any orders yet. Would you like to place an order?",
            });
          }

          const ordersList = recentOrders
            .map((o) => `${o.orderId} - ${o.productName} - ₹${o.totalAmount} (${o.status})`)
            .join("\n");

          return res.json({
            reply: `Your recent orders:\n\n${ordersList}\n\nPlease share your Order ID (e.g., ORD12345) to check details.`,
          });
        } catch (err) {
          return res.json({
            reply: "Please share your Order ID to check order status.",
          });
        }
      }
    }

    // Cancel order
    if (intent === "cancel_order" || message.toLowerCase().includes("cancel order")) {
      const orderIdMatch = message.match(/ORD[A-Z0-9]+/i);
      if (orderIdMatch) {
        const orderId = orderIdMatch[0].toUpperCase();
        try {
          const foundOrder = await Order.findOne({ orderId, userId: order.userId });

          if (!foundOrder) {
            return res.json({
              reply: `Order ${orderId} not found.`,
            });
          }

          if (["completed", "cancelled"].includes(foundOrder.status)) {
            return res.json({
              reply: `Order ${orderId} cannot be cancelled. Status: ${foundOrder.status}`,
            });
          }

          foundOrder.status = "cancelled";
          foundOrder.updatedAt = new Date();
          await foundOrder.save();

          return res.json({
            reply: `✅ Order ${orderId} has been cancelled successfully.`,
          });
        } catch (err) {
          console.error("Error cancelling order:", err);
          return res.json({
            reply: "Sorry, there was an error cancelling your order.",
          });
        }
      } else {
        return res.json({
          reply: "Please provide your Order ID to cancel (e.g., cancel ORD12345)",
        });
      }
    }

    return res.json({ reply: "How can I help you?" });
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    return res.status(500).json({
      error: "Failed to process request",
      details: error.message,
    });
  }
});

// ========== PAYMENT ENDPOINTS ==========

// Payment confirmation endpoint
app.post("/api/payment/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentId, status } = req.body;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status === "paid" || order.status === "completed") {
      return res.json({ message: "Order already paid", order });
    }

    if (status === "success" || status === "paid") {
      order.status = "paid";
      order.paymentId = paymentId || `PAY${Date.now()}`;
      order.updatedAt = new Date();
      await order.save();

      return res.json({
        message: "Payment confirmed successfully",
        order: {
          orderId: order.orderId,
          status: order.status,
          totalAmount: order.totalAmount,
        },
      });
    } else {
      return res.status(400).json({ error: "Payment failed" });
    }
  } catch (error) {
    console.error("Payment confirmation error:", error);
    res.status(500).json({ error: "Failed to confirm payment", details: error.message });
  }
});

// Get payment link for order
app.get("/api/payment/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.paymentMethod !== "Online") {
      return res.status(400).json({ error: "This order is not an online payment order" });
    }

    res.json({
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      paymentLink: order.paymentLink,
      status: order.status,
    });
  } catch (error) {
    console.error("Get payment link error:", error);
    res.status(500).json({ error: "Failed to get payment link", details: error.message });
  }
});

// ========== ORDER MANAGEMENT ==========

// Get order by ID
app.get("/api/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId })
      .populate("userId", "name mobile")
      .populate("productId", "name price description")
      .populate("providerId", "name chatbotId");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ order });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ error: "Failed to get order", details: error.message });
  }
});

// Get order history for user
app.get("/api/orders/:chatbotId/:mobile", async (req, res) => {
  try {
    const { chatbotId, mobile } = req.params;
    const provider = await Provider.findOne({ chatbotId });
    if (!provider) {
      return res.status(404).json({ error: "Chatbot not found" });
    }

    const user = await User.findOne({ mobile, chatbotId });
    if (!user) {
      return res.json({ orders: [] });
    }

    const orders = await Order.find({ userId: user._id, providerId: provider._id })
      .sort({ createdAt: -1 })
      .populate("productId", "name price");

    res.json({ orders });
  } catch (error) {
    console.error("Get order history error:", error);
    res.status(500).json({ error: "Failed to get order history", details: error.message });
  }
});

// Get all orders for provider
app.get("/api/provider/orders", authenticateProvider, async (req, res) => {
  try {
    const { status, limit, page } = req.query;
    const query = { providerId: req.provider._id };
    if (status) {
      query.status = status;
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("userId", "name mobile")
      .populate("productId", "name price");

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get provider orders error:", error);
    res.status(500).json({ error: "Failed to get orders", details: error.message });
  }
});

// Get order statistics for provider
app.get("/api/provider/orders/stats", authenticateProvider, async (req, res) => {
  try {
    const providerId = req.provider._id;

    const stats = await Order.aggregate([
      { $match: { providerId: providerId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totalOrders = await Order.countDocuments({ providerId });
    const totalRevenue = await Order.aggregate([
      { $match: { providerId, status: { $in: ["paid", "completed", "confirmed"] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    const recentOrders = await Order.find({ providerId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "name mobile")
      .populate("productId", "name");

    const statusCounts = {
      pending: 0,
      confirmed: 0,
      payment_pending: 0,
      paid: 0,
      completed: 0,
      cancelled: 0,
    };

    stats.forEach((stat) => {
      statusCounts[stat._id] = stat.count;
    });

    res.json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      statusCounts,
      recentOrders,
    });
  } catch (error) {
    console.error("Get order stats error:", error);
    res.status(500).json({ error: "Failed to get order statistics", details: error.message });
  }
});

// Get new/pending orders for provider (for notifications)
app.get("/api/provider/orders/new", authenticateProvider, async (req, res) => {
  try {
    const orders = await Order.find({
      providerId: req.provider._id,
      status: { $in: ["pending", "confirmed", "payment_pending", "paid"] },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("userId", "name mobile")
      .populate("productId", "name price");

    res.json({ orders, count: orders.length });
  } catch (error) {
    console.error("Get new orders error:", error);
    res.status(500).json({ error: "Failed to get new orders", details: error.message });
  }
});

// Update order status (Provider only)
app.patch("/api/provider/orders/:orderId", authenticateProvider, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ orderId, providerId: req.provider._id });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const validStatuses = ["pending", "confirmed", "payment_pending", "paid", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    res.json({
      message: "Order status updated",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ error: "Failed to update order status", details: error.message });
  }
});

// Cancel order (User)
app.post("/api/orders/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { mobile, chatbotId } = req.body;

    if (!mobile || !chatbotId) {
      return res.status(400).json({ error: "Mobile and chatbotId are required" });
    }

    const provider = await Provider.findOne({ chatbotId });
    if (!provider) {
      return res.status(404).json({ error: "Chatbot not found" });
    }

    const user = await User.findOne({ mobile, chatbotId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const order = await Order.findOne({ orderId, userId: user._id });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (["completed", "cancelled"].includes(order.status)) {
      return res.status(400).json({ error: `Order cannot be cancelled. Current status: ${order.status}` });
    }

    order.status = "cancelled";
    order.updatedAt = new Date();
    await order.save();

    res.json({
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ error: "Failed to cancel order", details: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

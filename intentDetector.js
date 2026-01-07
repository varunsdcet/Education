import OpenAI from "openai";
import "dotenv/config";

// Azure OpenAI Configuration
const AZURE_ENDPOINT = process.env.AZURE_ENDPOINT;
const AZURE_API_KEY = process.env.AZURE_API_KEY;
const AZURE_DEPLOYMENT = process.env.AZURE_DEPLOYMENT || "gpt-4o-2";
const AZURE_API_VERSION = process.env.AZURE_API_VERSION || "2024-02-01";

if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
  console.error("Error: AZURE_ENDPOINT and AZURE_API_KEY must be set in environment variables");
}

// Configure OpenAI SDK for Azure
const openai = new OpenAI({
  apiKey: AZURE_API_KEY,
  baseURL: `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}`,
  defaultQuery: { "api-version": AZURE_API_VERSION },
  defaultHeaders: {
    "api-key": AZURE_API_KEY,
  },
});

export async function detectIntent(message) {
  try {
    const prompt = `
You are an intent classifier for an ecommerce chatbot.

Available intents:
- browse_products
- place_order
- make_payment
- order_status
- cancel_order
- unknown

Return ONLY valid JSON (no markdown, no code blocks, just pure JSON):
{
  "intent": "",
  "entities": {}
}

Examples:
User: "show me products" → {"intent": "browse_products", "entities": {}}
User: "I want to order" → {"intent": "place_order", "entities": {}}
User: "check my order" → {"intent": "order_status", "entities": {}}
User: "cancel order" → {"intent": "cancel_order", "entities": {}}
`;

    const response = await openai.chat.completions.create({
      model: AZURE_DEPLOYMENT,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: message },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      console.warn("Empty response from OpenAI");
      return { intent: "unknown", entities: {} };
    }

    // Remove markdown code blocks if present
    const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const parsed = JSON.parse(jsonContent);
    
    // Validate intent
    const validIntents = ["browse_products", "place_order", "make_payment", "order_status", "cancel_order", "unknown"];
    if (!validIntents.includes(parsed.intent)) {
      console.warn(`Invalid intent detected: ${parsed.intent}, defaulting to unknown`);
      parsed.intent = "unknown";
    }

    return {
      intent: parsed.intent || "unknown",
      entities: parsed.entities || {},
    };
  } catch (error) {
    console.error("Error in detectIntent:", error);
    
    // Fallback intent detection based on keywords
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes("product") || lowerMessage.includes("show") || lowerMessage.includes("browse") || lowerMessage.includes("list")) {
      return { intent: "browse_products", entities: {} };
    }
    if (lowerMessage.includes("order") && (lowerMessage.includes("place") || lowerMessage.includes("want") || lowerMessage.includes("buy"))) {
      return { intent: "place_order", entities: {} };
    }
    if (lowerMessage.includes("status") || lowerMessage.includes("check") || lowerMessage.includes("track")) {
      return { intent: "order_status", entities: {} };
    }
    if (lowerMessage.includes("cancel")) {
      return { intent: "cancel_order", entities: {} };
    }
    
    return { intent: "unknown", entities: {} };
  }
}


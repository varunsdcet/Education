import mongoose from "../db.js";

const providerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  chatbotId: { type: String, required: true, unique: true, index: true }, // Auto-generated if not provided
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Provider", providerSchema);


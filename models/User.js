import mongoose from "../db.js";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  chatbotId: { type: String, required: true }, // Which provider's chatbot they're using
  createdAt: { type: Date, default: Date.now },
});

// Compound unique index: same mobile can register with different chatbots
userSchema.index({ mobile: 1, chatbotId: 1 }, { unique: true });

export default mongoose.model("User", userSchema);


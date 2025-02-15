const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, default: "Sent" },
});

module.exports = mongoose.model("Message", MessageSchema);

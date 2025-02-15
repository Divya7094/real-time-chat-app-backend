require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const Message = require("./models/Message");
const User = require("./models/User");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";

// ✅ Connect to MongoDB
const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://divyat51951:RealTimeChat2025@real-time-chat.ohbnk.mongodb.net/?retryWrites=true&w=majority&appName=Real-Time-Chat";
mongoose
  .connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ WebSocket Setup
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});

// ✅ WebSocket Events
io.on("connection", async (socket) => {
  console.log(`🔌 User Connected: ${socket.id}`);

  try {
    const token = socket.handshake.auth.token;
    if (!token) throw new Error("No token provided");

    const decoded = jwt.verify(token, SECRET_KEY);
    socket.user = decoded;
    console.log(`✅ Authenticated User: ${socket.user.username}`);
  } catch (error) {
    console.log("❌ Authentication error:", error.message);
    return socket.disconnect();
  }

  // ✅ Send previous messages (last 50 messages)
  const previousMessages = await Message.find().sort({ timestamp: -1 }).limit(50);
  socket.emit("previous_messages", previousMessages.reverse());

  // ✅ Handle sending messages
  socket.on("send_message", async (data) => {
    if (!socket.user || !socket.user.username) {
      console.log("❌ Message rejected: No valid user");
      return;
    }
  
    console.log(`✅ Message from ${socket.user.username}:`, data.message);
  
    const newMessage = new Message({
      username: socket.user.username,
      message: data.message,
      timestamp: new Date(),
      status: "Sent", // Initially "Sent"
    });
  
    await newMessage.save();
    console.log("✅ Message saved to DB:", newMessage);
  
    // ✅ Emit the message with "Sent" status immediately
    const sentMessage = { ...newMessage._doc, status: "Sent" };
    io.emit("receive_message", sentMessage);
  
    // ✅ Simulate delivery confirmation after 500ms
    setTimeout(async () => {
      console.log("⏳ Updating message status to 'Delivered' in DB...");
  
      const updatedMessage = await Message.findByIdAndUpdate(
        newMessage._id,
        { status: "Delivered" },
        { new: true } // Return updated document
      );
  
      if (!updatedMessage) {
        console.log("❌ Failed to update message status in DB.");
        return;
      }
  
      console.log("📩 Message status updated to 'Delivered':", updatedMessage);
  
      io.emit("message_delivered", updatedMessage); // Emit to frontend
    }, 500);
  });


  socket.on("disconnect", () => {
    console.log(`❌ User Disconnected: ${socket.id}`);
  });
});

// ✅ Signup Route
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (await User.findOne({ username })) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Login Route
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id, username: user.username }, SECRET_KEY, { expiresIn: "1h" });

    res.status(200).json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket listening on ws://localhost:${PORT}`);
});

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
const authMiddleware = require("./middleware/authMiddleware");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const SECRET_KEY = process.env.JWT_SECRET || "22194c3165c0528bfc047f8be72c6adf5475e0a63440232eadbea756c1a1c749353dd1e698deb822b75a08e09b352ed471d76481e9ac5d52be288ecf87597bc9";

// ✅ Connect to MongoDB
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/chatApp";
mongoose
  .connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ WebSocket Setup (Only 1 instance)
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});

// ✅ WebSocket Events
io.on("connection", async (socket) => {
  console.log(`🔌 User Connected: ${socket.id}`);

  // ✅ Check authentication
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

  // ✅ Listen for new messages
  socket.on("send_message", async (data) => {
    console.log("📩 Received Message Data:", data); // Debugging line

    if (!socket.user || !socket.user.username) {
      console.log("❌ Message rejected: No valid user");
      return;
    }

    console.log(`✅ Message from ${socket.user.username}:`, data.message);

    const newMessage = new Message({
      username: socket.user.username, // ✅ Ensure username is correctly assigned
      message: data.message,
      timestamp: new Date(),
    });

    await newMessage.save();
    console.log("✅ Message saved to DB:", newMessage);

    io.emit("receive_message", newMessage);
  });

  socket.on("disconnect", () => {
    console.log(`❌ User Disconnected: ${socket.id}`);
  });
});



// ✅ Signup Route (Stores Hashed Password)
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "Username already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Login Route (Uses bcrypt.compare)
app.post("/login", async (req, res) => {
  try {
    console.log("🔹 Login attempt:", req.body);

    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) return res.status(401).json({ message: "User not found" });

    console.log("✅ User found:", user.username);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id, username: user.username }, SECRET_KEY, { expiresIn: "1h" });

    console.log("✅ Login Successful");
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

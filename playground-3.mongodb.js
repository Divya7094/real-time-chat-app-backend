
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected!"))
  .catch((err) => console.log("MongoDB connection error:", err));

// WebSocket Setup
const io = new Server(server, {
  cors: {
    origin: "*", // Change to your front-end URL in production
    methods: ["GET", "POST"],
  },
});

// When a user connects
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Listen for messages from client
  socket.on("send_message", (data) => {
    console.log("Message Received:", data);
    io.emit("receive_message", data); // Send message to all connected clients
  });

  // When a user disconnects
  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${socket.id}`);
  });
});

// Server Listen
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

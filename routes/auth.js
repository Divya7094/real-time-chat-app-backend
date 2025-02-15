const express = require("express");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Signup Route
router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ message: "Username already exists" });

    // Create new user
    user = new User({ username, password });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;

router.post("/login", async (req, res) => {
    try {
      const { username, password } = req.body;
  
      // Find user
      const user = await User.findOne({ username });
      if (!user) return res.status(400).json({ message: "Invalid username or password" });
  
      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) return res.status(400).json({ message: "Invalid username or password" });
  
      // Generate JWT Token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  
      res.json({ message: "Login successful", token });
    } catch (error) {
      res.status(500).json({ message: "Server Error" });
    }
  });
  
  module.exports = router;
  
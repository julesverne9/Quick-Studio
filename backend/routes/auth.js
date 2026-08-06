const express = require("express");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { protectRoute } = require("../middleware/authMiddleware");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "development_jwt_secret";
const JWT_EXPIRES_IN = "7d";

const generateToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      tier: user.subscriptionTier,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

const buildAuthResponse = (user, token) => ({
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    subscriptionTier: user.subscriptionTier,
    createdAt: user.createdAt,
  },
});

const registerHandler = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Name, email, and password are all required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    const existingUser = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with that email already exists.",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: "Account created successfully.",
      ...buildAuthResponse(user, token),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "An account with that email already exists.",
      });
    }

    console.error("Register error:", error);
    return res.status(500).json({
      message: "Unable to create account right now.",
    });
  }
};

router.post("/register", registerHandler);
router.post("/signup", registerHandler);

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful.",
      ...buildAuthResponse(user, token),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Unable to log in right now.",
    });
  }
});

router.get("/me", protectRoute, async (req, res) => {
  try {
    return res.status(200).json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        subscriptionTier: req.user.subscriptionTier,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    console.error("Fetch user error:", error);
    return res.status(500).json({
      message: "Unable to fetch user data.",
    });
  }
});

module.exports = router;

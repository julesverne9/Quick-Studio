const crypto = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashPassword = (password, salt) =>
  crypto.scryptSync(password, salt, 64).toString("hex");

const buildAuthResponse = (user) => {
  const token = jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      name: user.name
    },
    process.env.JWT_SECRET || "development_jwt_secret",
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    }
  };
};

router.post("/signup", async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password || "";

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are all required."
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long."
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: "An account with that email already exists."
      });
    }

    const passwordSalt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, passwordSalt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      passwordSalt
    });

    return res.status(201).json({
      message: "Account created successfully.",
      ...buildAuthResponse(user)
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "An account with that email already exists."
      });
    }

    console.error("Signup failed:", error);
    return res.status(500).json({
      message: "Unable to create account right now."
    });
  }
});

module.exports = router;

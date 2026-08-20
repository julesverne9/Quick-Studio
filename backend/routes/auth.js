const express = require("express");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const User = require("../models/User");
const { protectRoute } = require("../middleware/authMiddleware");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "development_jwt_secret";
const JWT_EXPIRES_IN = "7d";

/* ── Validation helpers ──────────────────────────────────────────── */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[a-zA-Z0-9 ]+$/;
const HAS_NUMBER = /\d/;

const validateRegistration = ({ name, email, password }) => {
  if (!name || name.length < 3) {
    return "Name must be at least 3 characters.";
  }
  if (!NAME_REGEX.test(name)) {
    return "Name must be alphanumeric (letters, numbers, spaces only).";
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return "Please provide a valid email address.";
  }
  if (!password || password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  if (!HAS_NUMBER.test(password)) {
    return "Password must include at least one number.";
  }
  return null;
};

const validateLogin = ({ email, password }) => {
  if (!email || !EMAIL_REGEX.test(email)) {
    return "Please provide a valid email address.";
  }
  if (!password || password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  return null;
};

/* ── JWT helpers ──────────────────────────────────────────────────── */

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
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  },
});

/* ── Nodemailer transport ────────────────────────────────────────── */
// Uses environment variables for SMTP configuration.
// For development/testing, services like Mailtrap or Gmail App Passwords work.

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const sendOtpEmail = async (toEmail, otp) => {
  // If SMTP is not configured, log the OTP to console for development
  if (!process.env.SMTP_USER) {
    console.log(`[DEV OTP] Email: ${toEmail}, OTP: ${otp}`);
    return;
  }

  await transporter.sendMail({
    from: `"QuickStudio" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Your QuickStudio Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f172a; border-radius: 16px; color: #f8fafc;">
        <h2 style="margin: 0 0 8px; color: #60a5fa;">QuickStudio</h2>
        <p style="margin: 0 0 24px; color: #94a3b8;">Your email verification code:</p>
        <div style="background: #1e293b; border-radius: 12px; padding: 24px; text-align: center; letter-spacing: 8px; font-size: 32px; font-weight: 800; color: #f8fafc;">
          ${otp}
        </div>
        <p style="margin: 24px 0 0; color: #64748b; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
};

/* ── POST /api/auth/register ─────────────────────────────────────── */

const registerHandler = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate inputs
    const validationError = validateRegistration({
      name: name?.trim(),
      email: email?.trim(),
      password,
    });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with that email already exists.",
      });
    }

    // Create user (unverified)
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      isEmailVerified: false,
    });

    // Generate and send OTP
    const otp = user.generateOtp();
    await user.save();
    await sendOtpEmail(cleanEmail, otp);

    return res.status(201).json({
      message: "Account created. Please verify your email with the OTP sent.",
      requiresVerification: true,
      email: cleanEmail,
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

/* ── POST /api/auth/verify-otp ───────────────────────────────────── */

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email?.trim() || !otp?.trim()) {
      return res.status(400).json({
        message: "Email and OTP are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+emailOtp +emailOtpExpiresAt");

    if (!user) {
      return res.status(404).json({
        message: "No account found with that email.",
      });
    }

    if (user.isEmailVerified) {
      // Already verified — just issue a token
      const token = generateToken(user);
      return res.status(200).json({
        message: "Email already verified.",
        ...buildAuthResponse(user, token),
      });
    }

    if (!user.verifyOtp(otp.trim())) {
      return res.status(400).json({
        message: "Invalid or expired OTP. Please request a new one.",
      });
    }

    // Mark as verified and clear OTP fields
    user.isEmailVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpiresAt = undefined;
    await user.save();

    const token = generateToken(user);

    return res.status(200).json({
      message: "Email verified successfully.",
      ...buildAuthResponse(user, token),
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      message: "Unable to verify OTP right now.",
    });
  }
});

/* ── POST /api/auth/resend-otp ───────────────────────────────────── */

router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(404).json({
        message: "No account found with that email.",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: "Email is already verified.",
      });
    }

    const otp = user.generateOtp();
    await user.save();
    await sendOtpEmail(user.email, otp);

    return res.status(200).json({
      message: "A new verification code has been sent to your email.",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({
      message: "Unable to resend OTP right now.",
    });
  }
});

/* ── POST /api/auth/login ────────────────────────────────────────── */

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    const validationError = validateLogin({
      email: email?.trim(),
      password,
    });
    if (validationError) {
      return res.status(400).json({ message: validationError });
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

    // Block unverified users
    if (!user.isEmailVerified) {
      // Re-send OTP automatically
      const otp = user.generateOtp();
      await user.save();
      await sendOtpEmail(user.email, otp);

      return res.status(403).json({
        message: "Please verify your email first. A new code has been sent.",
        requiresVerification: true,
        email: user.email,
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

/* ── GET /api/auth/me ────────────────────────────────────────────── */

router.get("/me", protectRoute, async (req, res) => {
  try {
    return res.status(200).json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        subscriptionTier: req.user.subscriptionTier,
        isEmailVerified: req.user.isEmailVerified,
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

/* ── DELETE /api/auth/me ─────────────────────────────────────────── */

router.delete("/me", protectRoute, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);

    return res.status(200).json({
      message: "Account deleted successfully.",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return res.status(500).json({
      message: "Unable to delete account right now.",
    });
  }
});

module.exports = router;

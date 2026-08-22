const express = require("express");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { protectRoute } = require("../middleware/authMiddleware");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
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

/* ── Transactional email (Resend HTTPS API) ──────────────────────── */

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const OTP_EMAIL_TIMEOUT_MS = 5000;

const sendOtpEmail = async (toEmail, otp) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error(
      "OTP email is not configured: set RESEND_API_KEY and RESEND_FROM_EMAIL."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OTP_EMAIL_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
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
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend returned ${response.status}: ${body}`);
    }
  } finally {
    clearTimeout(timeout);
  }
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

    // Generate the OTP before the initial save so registration has one
    // database write and cannot create an account before the response path.
    const user = new User({
      name: name.trim(),
      email: cleanEmail,
      password,
      isEmailVerified: false,
    });

    const otp = user.generateOtp();
    await user.save();

    // Fire-and-forget: send email in background so the HTTP response is instant.
    // If SMTP is slow or fails, the user can still use "Resend Code" on the OTP screen.
    sendOtpEmail(cleanEmail, otp).catch((err) =>
      console.error("[Register] OTP email delivery failed:", err.message)
    );

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

    try {
      await sendOtpEmail(user.email, otp);
    } catch (error) {
      console.error("[Resend] OTP email delivery failed:", error.message);
      return res.status(502).json({
        message: "Unable to send a verification email right now. Please try again later.",
      });
    }

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
      // Re-send OTP in background (fire-and-forget)
      const otp = user.generateOtp();
      await user.save();
      sendOtpEmail(user.email, otp).catch((err) =>
        console.error("[Login] OTP email delivery failed:", err.message)
      );

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

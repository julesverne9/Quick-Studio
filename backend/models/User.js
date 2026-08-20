const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [3, "Name must be at least 3 characters."],
      maxlength: [80, "Name must be at most 80 characters."],
      match: [/^[a-zA-Z0-9 ]+$/, "Name must be alphanumeric."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address.",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [6, "Password must be at least 6 characters."],
      select: false, // Never returned in queries by default
    },
    subscriptionTier: {
      type: String,
      enum: {
        values: ["free", "pro"],
        message: "{VALUE} is not a valid subscription tier.",
      },
      default: "free",
    },

    /* ── Email verification fields ──────────────────────────────── */
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailOtp: {
      type: String,
      select: false, // Never returned in queries by default
    },
    emailOtpExpiresAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

/* ── Pre-save hook: hash password only when modified ─────────────── */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

/* ── Instance method: compare candidate password against hash ────── */
userSchema.methods.matchPassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/* ── Instance method: generate a 6-digit OTP with 10-min expiry ──── */
userSchema.methods.generateOtp = function () {
  const otp = crypto.randomInt(100000, 999999).toString();
  this.emailOtp = otp;
  this.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

/* ── Instance method: verify OTP ─────────────────────────────────── */
userSchema.methods.verifyOtp = function (candidateOtp) {
  if (!this.emailOtp || !this.emailOtpExpiresAt) return false;
  if (new Date() > this.emailOtpExpiresAt) return false;
  return this.emailOtp === candidateOtp;
};

/* ── Ensure password & OTP are never serialised to JSON ───────────── */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailOtp;
  delete obj.emailOtpExpiresAt;
  return obj;
};

module.exports = mongoose.model("User", userSchema);

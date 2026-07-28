const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * protectRoute
 * ------------
 * Verifies the `Authorization: Bearer <token>` header, decodes the JWT,
 * fetches the full user document (excluding password), and attaches it
 * to `req.user`.  Returns 401 on missing / invalid / expired tokens.
 */
const protectRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorised — no token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "development_jwt_secret"
    );

    // Fetch the live user document so tier changes are always current
    const user = await User.findById(decoded.sub).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "Not authorised — user no longer exists.",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired." });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token." });
    }
    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * requireProTier
 * --------------
 * Must be chained AFTER `protectRoute`.
 * Checks if the authenticated user has a 'pro' subscription.
 * Returns 403 with `{ error: 'pro_required' }` for free-tier users.
 */
const requireProTier = (req, res, next) => {
  if (req.user?.subscriptionTier !== "pro") {
    return res.status(403).json({
      error: "pro_required",
      message:
        "This feature requires a Pro subscription. Please upgrade to continue.",
    });
  }
  return next();
};

module.exports = { protectRoute, requireProTier };

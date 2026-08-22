const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

dotenv.config();

const requireEnvironmentVariable = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[Startup] Missing required environment variable: ${name}`);
  }
  return value;
};

// Never start with implicit development credentials or database targets.
const mongoURI = requireEnvironmentVariable("MONGODB_URI");
requireEnvironmentVariable("JWT_SECRET");

// Native clients do not send an Origin header. Browser origins, when enabled,
// must be explicitly configured as a comma-separated CORS_ORIGIN allow-list.
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => !origin || allowedOrigins.includes(origin);
const corsOptions = {
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: corsOptions.methods,
    allowedHeaders: corsOptions.allowedHeaders,
  },
});
const port = process.env.PORT || 5000;

app.set("socketio", io);

/* ── Middleware ──────────────────────────────────────────────────────── */

app.use(cors(corsOptions));
app.use(express.json());

// Ensure uploads directory exists (Render containers start fresh)
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));
app.use("/public", express.static(path.join(__dirname, "public")));

/* ── Routes ─────────────────────────────────────────────────────────── */

app.use("/api/auth", require("./routes/auth"));
app.use("/api/video", require("./routes/video"));
app.use("/api/media", require("./routes/media"));
app.use("/api/projects", require("./routes/projects"));

/* ── Health check ───────────────────────────────────────────────────── */

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "QuickStudio backend is running." });
});

/* ── Socket.io ──────────────────────────────────────────────────────── */

io.on("connection", (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  socket.emit("handshake", {
    message: "QuickStudio real-time channel connected.",
  });

  socket.on("disconnect", () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

/* ── Global error handler ───────────────────────────────────────────── */
// Catches unhandled errors from route handlers and prevents the Node
// process from crashing on Render's Linux containers.

app.use((err, _req, res, _next) => {
  console.error("[Global Error Handler]", err.stack || err.message || err);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "Uploaded file exceeds the allowed size limit.",
    });
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "An unexpected server error occurred.",
  });
});

/* ── Database & startup ─────────────────────────────────────────────── */

const connectDatabase = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

const startServer = async () => {
  await connectDatabase();

  server.listen(port, "0.0.0.0", () => {
    console.log(
      `Server listening on port ${port} (${process.env.NODE_ENV || "development"})`
    );
  });
};

startServer();

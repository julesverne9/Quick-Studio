const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const port = process.env.PORT || 5000;

app.set("socketio", io);

/* ── Middleware ──────────────────────────────────────────────────────── */

app.use(cors());
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
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "An unexpected server error occurred.",
  });
});

/* ── Database & startup ─────────────────────────────────────────────── */

const mongoURI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb+srv://9f34sivaraman_db_user:J81wkxmTjnWslvVe@quick-studio.pjnvpgz.mongodb.net/quickstudio?retryWrites=true&w=majority";

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

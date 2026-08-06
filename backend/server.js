const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const path = require("path");

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

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/public", express.static(path.join(__dirname, "public")));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/video", require("./routes/video"));
app.use("/api/media", require("./routes/media"));
app.use("/api/projects", require("./routes/projects"));

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

io.on("connection", (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  socket.emit("handshake", {
    message: "QuickStudio real-time channel connected.",
  });

  socket.on("disconnect", () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "QuickStudio backend is running." });
});

const startServer = async () => {
  await connectDatabase();

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port}`);
  });
};

startServer();

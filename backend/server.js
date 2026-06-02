const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

const validateJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authorization token is required for export rendering."
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET || "development_jwt_secret"
    );
    req.user = decodedToken;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

io.on("connection", (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  socket.emit("handshake", {
    message: "QuickStudio real-time channel connected."
  });

  socket.on("disconnect", () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "QuickStudio backend is running." });
});

app.post("/api/projects/render", validateJwt, (req, res) => {
  res.status(202).json({
    message: "Render request accepted for authenticated user.",
    requestedBy: req.user,
    renderPayload: req.body
  });
});

const startServer = async () => {
  await connectDatabase();

  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
};

startServer();

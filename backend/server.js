const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const path = require('path');
const validateJwt = require("./middleware/validateJwt");

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

app.set("socketio", io);

app.use(cors());
app.use(express.json());
// Expose your folders over public static URLs so mobile devices can display your output
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Bind your fresh multimedia pipeline endpoints onto the Express app instance
app.use('/api/auth', require('./routes/auth'));
app.use('/api/media', require('./routes/media'));
app.use('/api/video', require('./routes/video'));


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

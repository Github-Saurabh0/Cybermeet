import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import roomRoutes from "./routes/rooms.js";

dotenv.config();
connectDB();

const app = express();

// ALLOWED CORS ORIGINS
const allowedOrigins = [
  "https://cybermeet.wearl.co.in",  // Your frontend domain
  "https://cybermeet-5nmt.onrender.com", // Self-origin for testing
  "http://localhost:5173", // Local dev
  process.env.CLIENT_ORIGIN
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST"],
}));

app.use(express.json());

// TEST ROUTE
app.get("/", (_req, res) => {
  res.send("CyberMeet Backend Running 🚀");
});

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

const server = http.createServer(app);

// SOCKET IO WITH CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// USERS IN ROOM
const roomUsers = {};

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-room", ({ roomId, userName }) => {
    socket.join(roomId);
    socket.data.userName = userName;
    socket.data.roomId = roomId;

    if (!roomUsers[roomId]) roomUsers[roomId] = [];
    roomUsers[roomId].push({ socketId: socket.id, userName });

    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      userName,
    });

    io.to(roomId).emit("room-users", roomUsers[roomId]);
  });

  socket.on("send-message", ({ roomId, message }) => {
    io.to(roomId).emit("receive-message", {
      socketId: socket.id,
      userName: socket.data.userName,
      message,
      createdAt: new Date().toISOString(),
    });
  });

  socket.on("typing", ({ roomId, isTyping }) => {
    socket.to(roomId).emit("user-typing", {
      socketId: socket.id,
      userName: socket.data.userName,
      isTyping,
    });
  });

  // WebRTC signaling
  socket.on("webrtc-offer", ({ to, offer }) => {
    io.to(to).emit("webrtc-offer", { from: socket.id, offer });
  });

  socket.on("webrtc-answer", ({ to, answer }) => {
    io.to(to).emit("webrtc-answer", { from: socket.id, answer });
  });

  socket.on("webrtc-ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("webrtc-ice-candidate", { from: socket.id, candidate });
  });

  // Disconnect
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    const userName = socket.data.userName;

    if (roomId && roomUsers[roomId]) {
      roomUsers[roomId] = roomUsers[roomId].filter(
        (u) => u.socketId !== socket.id
      );
      socket.to(roomId).emit("user-left", {
        socketId: socket.id,
        userName,
      });
      io.to(roomId).emit("room-users", roomUsers[roomId]);
      if (roomUsers[roomId].length === 0) delete roomUsers[roomId];
    }

    console.log("Client disconnected:", socket.id);
  });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`CyberMeet Backend on ${PORT} ⚡`);
});

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

// CORS Protection
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// Health Check API
app.get("/", (_req, res) => {
  res.send("CyberMeet Server is Running 🚀");
});

// APIs
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

const server = http.createServer(app);

// Socket.io Config
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

// Store Room Users in Memory
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
    const payload = {
      socketId: socket.id,
      userName: socket.data.userName,
      message,
      createdAt: new Date().toISOString(),
    };

    io.to(roomId).emit("receive-message", payload);
  });

  socket.on("typing", ({ roomId, isTyping }) => {
    socket.to(roomId).emit("user-typing", {
      socketId: socket.id,
      userName: socket.data.userName,
      isTyping,
    });
  });

  // WebRTC Signaling
  socket.on("webrtc-offer", ({ to, offer }) => {
    io.to(to).emit("webrtc-offer", { from: socket.id, offer });
  });

  socket.on("webrtc-answer", ({ to, answer }) => {
    io.to(to).emit("webrtc-answer", { from: socket.id, answer });
  });

  socket.on("webrtc-ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("webrtc-ice-candidate", { from: socket.id, candidate });
  });

  // Handle User Disconnect
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    const userName = socket.data.userName;

    if (roomId && roomUsers[roomId]) {
      roomUsers[roomId] = roomUsers[roomId].filter(
        (user) => user.socketId !== socket.id
      );

      socket.to(roomId).emit("user-left", {
        socketId: socket.id,
        userName,
      });

      io.to(roomId).emit("room-users", roomUsers[roomId]);

      if (roomUsers[roomId].length === 0) {
        delete roomUsers[roomId];
      }
    }

    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`CyberMeet Backend running on port ${PORT} 🎯`);
});

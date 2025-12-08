import express from "express";
import { Room } from "../models/Room.js";
import jwt from "jsonwebtoken";

const router = express.Router();

const auth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Create room with custom code & add creator as participant
router.post("/", auth, async (req, res) => {
  try {
    const { name, code, userName } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: "Name + Code required" });
    }

    const exists = await Room.findOne({ code });
    if (exists) {
      return res.status(400).json({ message: "Code already exists" });
    }

    const room = await Room.create({
      name,
      code,
      createdBy: req.userId,
      participants: [{ userId: req.userId, userName }]
    });

    res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Join room by code + add user to participants if not exists
router.post("/join", auth, async (req, res) => {
  try {
    const { code, userName } = req.body;
    const room = await Room.findOne({ code });
    if (!room) return res.status(404).json({ message: "Room not found" });

    const alreadyJoined = room.participants.some(
      (p) => p.userId.toString() === req.userId.toString()
    );

    if (!alreadyJoined) {
      room.participants.push({
        userId: req.userId,
        userName
      });
      await room.save();
    }

    res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch room by code for validation
router.get("/by-code/:code", auth, async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code });
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

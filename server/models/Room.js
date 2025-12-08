import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    participants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        userName: String
      }
    ]
  },
  { timestamps: true }
);

export const Room = mongoose.model("Room", roomSchema);

import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";

const RoomJoin = ({ onRoomSelected }) => {
  const { token, API_BASE, user } = useAuth();
  const [roomName, setRoomName] = useState(`${user.name}'s Meeting`);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  const axiosAuth = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}` }
  });

  const randomCode = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const createRoom = async () => {
    try {
      setError("");
      const code = randomCode();
      const res = await axiosAuth.post("/api/rooms", {
        name: roomName,
        code,
        userName: user.name
      });
      onRoomSelected(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create room");
    }
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return setError("Enter room code");
    try {
      setError("");
      const res = await axiosAuth.post("/api/rooms/join", {
        code: joinCode,
        userName: user.name
      });
      onRoomSelected(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Room not found");
    }
  };

  return (
    <div className="room-join">
      <div className="room-card">
        <h2>Start a meeting</h2>
        <input
          placeholder="Meeting name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
        <button onClick={createRoom}>Create Meeting 🚀</button>
      </div>

      <div className="room-card">
        <h2>Join a meeting</h2>
        <input
          placeholder="Enter meeting code (ex: ABC123)"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && joinRoom()}
        />
        <button disabled={!joinCode} onClick={joinRoom}>
          Join Now 🎥
        </button>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default RoomJoin;
